#!/usr/bin/env node

import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { createInterface } from "readline"

const __dirname = dirname(fileURLToPath(import.meta.url))

function preguntar(pregunta) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      rl.close()
      resolve(respuesta.trim())
    })
  })
}

async function main() {
  console.log("=== LIMPIAR DATOS DEL SISTEMA ===\n")
  console.log("Este script eliminará TODOS los datos de Firestore:")
  console.log("  - Clientes")
  console.log("  - Tiendas")
  console.log("  - Pedidos (con sus productos)")
  console.log("  - Inventario")
  console.log("  - Ventas")
  console.log("  (Los usuarios de Firebase Auth NO se eliminan)\n")

  const rutaJson = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, "..", "service-account.json")

  if (!existsSync(rutaJson)) {
    console.error("No se encuentra la credencial de servicio.")
    console.error("\nPara obtenerla:")
    console.error("  1. Ve a https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk")
    console.error("  2. Selecciona tu proyecto")
    console.error("  3. Haz clic en 'Generar nueva clave privada'")
    console.error("  4. Guarda el archivo como 'service-account.json' en la raíz del proyecto")
    console.error("\nO usa la variable de entorno GOOGLE_APPLICATION_CREDENTIALS")
    process.exit(1)
  }

  const confirmacion = await preguntar("\nEscribe 'BORRAR' para confirmar: ")
  if (confirmacion !== "BORRAR") {
    console.log("Operación cancelada.")
    process.exit(0)
  }

  const serviceAccount = JSON.parse(readFileSync(rutaJson, "utf-8"))

  const admin = await import("firebase-admin")

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  }

  const db = admin.firestore()
  console.log(`\nConectado a: ${serviceAccount.project_id}\n`)

  async function borrarColeccion(nombre) {
    const snapshot = await db.collection(nombre).get()
    if (snapshot.empty) {
      console.log(`  ✓ ${nombre} — vacía`)
      return
    }
    const batch = db.batch()
    snapshot.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    console.log(`  ✓ ${nombre} — ${snapshot.size} documento(s) eliminado(s)`)
  }

  async function borrarPedidosConProductos() {
    const snapshot = await db.collection("pedidos").get()
    if (snapshot.empty) {
      console.log("  ✓ pedidos — vacía")
      return
    }

    let totalProductos = 0
    for (const doc of snapshot.docs) {
      const subSnapshot = await db.collection("pedidos").doc(doc.id).collection("productos").get()
      if (!subSnapshot.empty) {
        const batch = db.batch()
        subSnapshot.docs.forEach((p) => batch.delete(p.ref))
        await batch.commit()
        totalProductos += subSnapshot.size
      }
    }

    const batch = db.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()

    console.log(`  ✓ pedidos — ${snapshot.size} pedido(s) + ${totalProductos} producto(s) eliminado(s)`)
  }

  await borrarColeccion("clientes")
  await borrarColeccion("tiendas")
  await borrarColeccion("inventario")
  await borrarColeccion("ventas")
  await borrarPedidosConProductos()

  console.log("\n✓ Todos los datos eliminados.")
  console.log("  Los usuarios de Firebase Auth permanecen intactos.")
}

main().catch((err) => {
  console.error("\nError:", err.message)
  process.exit(1)
})
