/**
 * Servicio de backup de Firestore → Google Drive (para entorno serverless de Vercel)
 *
 * A diferencia del script local (que usa rclone), este servicio usa la
 * Google Drive API v3 directamente con OAuth (refresh token).
 *
 * Variables de entorno requeridas:
 * - FIREBASE_SERVICE_ACCOUNT: JSON de la service account (Admin SDK)
 * - GOOGLE_DRIVE_REFRESH_TOKEN: refresh token OAuth (obtenido con rclone)
 * - GOOGLE_DRIVE_CLIENT_ID: client id (por defecto: compartido de rclone)
 * - GOOGLE_DRIVE_CLIENT_SECRET: client secret (por defecto: compartido de rclone)
 */

export const CARPETA_DRIVE = "Muv-Backups"
export const MAX_BACKUPS = 7
export const PREFIJO_ARCHIVO = "muv-firestore"

const CLIENT_ID_COMPARTIDO_RCLONE = "202264815644.apps.googleusercontent.com"
const CLIENT_SECRET_COMPARTIDO_RCLONE = "X4Z3ca8xfWDb1Voo-F9a7ZxJ"

interface DatosBackup {
  [ruta: string]: Record<string, unknown>
}

interface ResultadoBackup {
  ok: boolean
  documentos?: number
  archivo?: string
  tamanioBytes?: number
  drive?: string
  error?: string
}

function fechaISO() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
}

export function serializarValor(valor: unknown): unknown {
  if (valor && typeof valor === "object") {
    const v = valor as { toDate?: () => Date }
    if (typeof v.toDate === "function") {
      return { __tipo: "fecha", valor: v.toDate().toISOString() }
    }
    if (Array.isArray(valor)) return valor.map(serializarValor)
    const obj: Record<string, unknown> = {}
    for (const [clave, val] of Object.entries(valor as Record<string, unknown>)) {
      obj[clave] = serializarValor(val)
    }
    return obj
  }
  return valor
}

async function exportarColeccionesRecursivo(coleccion: FirebaseFirestore.CollectionReference, resultado: DatosBackup) {
  const snapshot = await coleccion.get()
  for (const doc of snapshot.docs) {
    resultado[doc.ref.path] = {
      ...(serializarValor(doc.data()) as Record<string, unknown>),
      _meta: { id: doc.id, ruta: doc.ref.path },
    }
    const subcolecciones = await doc.ref.listCollections()
    for (const sub of subcolecciones) {
      await exportarColeccionesRecursivo(sub, resultado)
    }
  }
}

export async function exportarFirestore(): Promise<{ datos: DatosBackup; totalDocs: number }> {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app")
  const { getFirestore } = await import("firebase-admin/firestore")

  const jsonCredencial = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!jsonCredencial) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT no está configurada")
  }

  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(jsonCredencial)) })
  }

  const db = getFirestore()
  const colecciones = await db.listCollections()
  const resultado: DatosBackup = {}

  for (const coleccion of colecciones) {
    await exportarColeccionesRecursivo(coleccion, resultado)
  }

  return { datos: resultado, totalDocs: Object.keys(resultado).length }
}

export async function obtenerAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  if (!refreshToken) throw new Error("GOOGLE_DRIVE_REFRESH_TOKEN no está configurado")

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || CLIENT_ID_COMPARTIDO_RCLONE
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || CLIENT_SECRET_COMPARTIDO_RCLONE

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    const cuerpo = await res.text()
    throw new Error(`Error al renovar token OAuth (${res.status}): ${cuerpo.slice(0, 300)}`)
  }

  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

export async function obtenerOCrearCarpeta(accessToken: string): Promise<string> {
  const consulta = encodeURIComponent(
    `name='${CARPETA_DRIVE}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${consulta}&spaces=drive&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) throw new Error(`Error al buscar carpeta (${res.status})`)

  const data = (await res.json()) as { files: Array<{ id: string }> }
  if (data.files.length > 0) return data.files[0].id

  const crear = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: CARPETA_DRIVE, mimeType: "application/vnd.google-apps.folder" }),
  })

  if (!crear.ok) throw new Error(`Error al crear carpeta (${crear.status})`)
  const creada = (await crear.json()) as { id: string }
  return creada.id
}

export async function subirArchivoDrive(accessToken: string, carpetaId: string, nombre: string, contenido: Uint8Array) {
  const metadata = JSON.stringify({ name: nombre, parents: [carpetaId] })
  const multipart = new FormData()
  multipart.append("metadata", new Blob([metadata], { type: "application/json" }))
  multipart.append("file", new Blob([new Uint8Array(contenido)], { type: "application/gzip" }), nombre)

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: multipart,
  })

  if (!res.ok) {
    const cuerpo = await res.text()
    throw new Error(`Error al subir a Drive (${res.status}): ${cuerpo.slice(0, 300)}`)
  }

  return (await res.json()) as { id: string; name: string }
}

export async function listarBackupsDrive(accessToken: string, carpetaId: string) {
  const consulta = encodeURIComponent(`'${carpetaId}' in parents and trashed=false and name contains '${PREFIJO_ARCHIVO}'`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${consulta}&orderBy=createdTime desc&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) throw new Error(`Error al listar backups en Drive (${res.status})`)
  const data = (await res.json()) as { files: Array<{ id: string; name: string }> }
  return data.files
}

export async function limpiarBackupsAntiguos(accessToken: string, carpetaId: string): Promise<number> {
  const backups = await listarBackupsDrive(accessToken, carpetaId)
  const antiguos = backups.slice(MAX_BACKUPS)

  for (const antiguo of antiguos) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${antiguo.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  return antiguos.length
}

export async function ejecutarBackup(): Promise<ResultadoBackup> {
  try {
    const { datos, totalDocs } = await exportarFirestore()

    const json = JSON.stringify(datos)
    const { gzipSync } = await import("zlib")
    const comprimido = gzipSync(json)

    const nombre = `${PREFIJO_ARCHIVO}-${fechaISO()}.json.gz`
    const accessToken = await obtenerAccessToken()
    const carpetaId = await obtenerOCrearCarpeta(accessToken)
    const subido = await subirArchivoDrive(accessToken, carpetaId, nombre, comprimido)
    await limpiarBackupsAntiguos(accessToken, carpetaId)

    return {
      ok: true,
      documentos: totalDocs,
      archivo: subido.name,
      tamanioBytes: comprimido.length,
      drive: `${CARPETA_DRIVE}/`,
      error: undefined,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
