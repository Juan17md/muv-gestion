#!/usr/bin/env node

/**
 * Backup diario de Firestore (proyecto muv-gestion)
 *
 * - Exporta todas las colecciones (incluidas subcolecciones) a un JSON
 * - Comprime en backups/muv-firestore-<fecha>.json.gz
 * - Sube a Google Drive con rclone (remoto "gdrive", carpeta "Muv-Backups")
 * - Conserva los últimos MAX_LOCAL_BACKUPS locales y los últimos
 *   MAX_REMOTE_BACKUPS en Drive
 *
 * Uso:
 *   node scripts/backup-firestore.mjs
 *   node scripts/backup-firestore.mjs --sin-subida
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync, statSync } from "fs"
import { join, dirname, basename } from "path"
import { fileURLToPath } from "url"
import { execFileSync } from "child_process"
import zlib from "zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROYECTO_DIR = join(__dirname, "..")
const CARPETA_BACKUPS = join(PROYECTO_DIR, "backups")
const CARPETA_DRIVE = "Muv-Backups"
const REMOTO_RCLONE = "gdrive"
const MAX_LOCAL_BACKUPS = 7
const MAX_REMOTE_BACKUPS = 7
const SIN_SUBIDA = process.argv.includes("--sin-subida")

const rutaCredencial = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(PROYECTO_DIR, "service-account.json")
const BIN_RCLONE = process.env.RCLONE_BIN || "/home/juan/.local/bin/rclone"

function log(mensaje, nivel = "info") {
  const prefijos = { info: "[INFO]", ok: "[OK]", warn: "[WARN]", error: "[ERROR]" }
  const linea = `${new Date().toISOString()} ${prefijos[nivel] || ""} ${mensaje}`
  console.log(linea)
}

function fechahora() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
}

function serializar(valor) {
  if (valor && typeof valor === "object") {
    if (typeof valor.toDate === "function") return { __tipo: "fecha", valor: valor.toDate().toISOString() }
    if (Array.isArray(valor)) return valor.map(serializar)
    const obj = {}
    for (const [clave, val] of Object.entries(valor)) obj[clave] = serializar(val)
    return obj
  }
  return valor
}

async function exportarColeccionRecursiva(db, coleccion, resultado) {
  const snapshot = await coleccion.get()
  for (const doc of snapshot.docs) {
    const rutaCompleta = doc.ref.path
    resultado[rutaCompleta] = {
      ...serializar(doc.data()),
      _meta: { id: doc.id, ruta: rutaCompleta },
    }
    const subcolecciones = await doc.ref.listCollections()
    for (const sub of subcolecciones) {
      await exportarColeccionRecursiva(db, sub, resultado)
    }
  }
}

function mantenerUltimos(carpeta, maximo) {
  const archivos = readdirSync(carpeta)
    .filter((f) => f.startsWith("muv-firestore-") && f.endsWith(".json.gz"))
    .map((f) => ({ nombre: f, ruta: join(carpeta, f), mtime: statSync(join(carpeta, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const antiguo of archivos.slice(maximo)) {
    unlinkSync(antiguo.ruta)
    log(`Eliminado backup local antiguo: ${antiguo.nombre}`)
  }
}

function listarRemotos() {
  try {
    const salida = execFileSync(BIN_RCLONE, ["lsf", `${REMOTO_RCLONE}:${CARPETA_DRIVE}`], { encoding: "utf-8" })
    return salida.split("\n").filter((f) => f.startsWith("muv-firestore-") && f.endsWith(".json.gz")).sort()
  } catch {
    return []
  }
}

function limpiarRemotos(maximo) {
  const remotos = listarRemotos()
  if (remotos.length <= maximo) return
  for (const antiguo of remotos.slice(0, remotos.length - maximo)) {
    try {
      execFileSync(BIN_RCLONE, ["deletefile", `${REMOTO_RCLONE}:${CARPETA_DRIVE}/${antiguo}`], { stdio: "pipe" })
      log(`Eliminado backup remoto antiguo: ${antiguo}`)
    } catch (e) {
      log(`No se pudo eliminar ${antiguo} en Drive: ${e.message}`, "warn")
    }
  }
}

async function main() {
  log("=== Backup de Firestore ===\n")
  log(`Proyecto: muv-gestion`)

  if (!existsSync(rutaCredencial)) {
    log(`No se encuentra la credencial de servicio en ${rutaCredencial}`, "error")
    log("Solicita el archivo service-account.json en Firebase Console > Configuración > Cuentas de servicio.")
    process.exit(1)
  }

  const serviceAccount = JSON.parse(readFileSync(rutaCredencial, "utf-8"))
  const admin = await import("firebase-admin")
  const { getFirestore } = await import("firebase-admin/firestore")

  if (!admin.getApps().length) {
    admin.initializeApp({ credential: admin.cert(serviceAccount) })
  }

  const db = getFirestore()

  const colecciones = await db.listCollections()
  if (colecciones.length === 0) {
    log("No hay colecciones que respaldar", "warn")
    return
  }

  const resultado = {}
  for (const coleccion of colecciones) {
    await exportarColeccionRecursiva(db, coleccion, resultado)
  }

  const totalDocs = Object.keys(resultado).length
  log(`Exportación completa: ${totalDocs} documento(s) exportados (incluyendo subcolecciones)`)

  mkdirSync(CARPETA_BACKUPS, { recursive: true })
  const nombreArchivo = `muv-firestore-${fechahora()}.json.gz`
  const rutaArchivo = join(CARPETA_BACKUPS, nombreArchivo)

  const json = JSON.stringify(resultado, null, 2)
  const contenidoGzip = zlib.gzipSync(json)
  writeFileSync(rutaArchivo, contenidoGzip)
  log(`Backup local creado: ${rutaArchivo} (${(contenidoGzip.length / 1024 / 1024).toFixed(2)} MB)`)

  mantenerUltimos(CARPETA_BACKUPS, MAX_LOCAL_BACKUPS)
  log(`Retención local aplicada: últimos ${MAX_LOCAL_BACKUPS} backups`)

  if (SIN_SUBIDA) {
    log("Modo --sin-subida: no se subirá a Google Drive")
    return
  }

  log(`Subiendo a Google Drive (${REMOTO_RCLONE}:${CARPETA_DRIVE})...`)
  try {
    execFileSync(BIN_RCLONE, ["copy", rutaArchivo, `${REMOTO_RCLONE}:${CARPETA_DRIVE}`], { stdio: "inherit" })
    log("Backup subido exitosamente a Google Drive")
  } catch (e) {
    log(`Error al subir a Google Drive: ${e.message}`, "error")
    process.exit(1)
  }

  limpiarRemotos(MAX_REMOTE_BACKUPS)
  log(`Retención remota aplicada: últimos ${MAX_REMOTE_BACKUPS} backups`)
  log("\n=== Backup finalizado con éxito ===")
}

main()
