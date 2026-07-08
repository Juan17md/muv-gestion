import { initializeApp, cert, getApps } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { readFileSync } from "fs"

const sa = JSON.parse(readFileSync("service-account.json", "utf8"))

if (!getApps().length) {
  initializeApp({ credential: cert(sa) })
}

const db = getFirestore()

async function migrar() {
  const pedidosSnap = await db.collection("pedidos").get()
  let total = 0

  for (const pedidoDoc of pedidosSnap.docs) {
    const prodsSnap = await db.collection("pedidos").doc(pedidoDoc.id).collection("productos").get()

    for (const prodDoc of prodsSnap.docs) {
      const data = prodDoc.data()
      if (data.margen !== undefined && data.descuento === undefined) {
        await prodDoc.ref.update({
          descuento: data.margen,
        })
        total++
        console.log(`✓ ${pedidoDoc.id}/${prodDoc.id}: margen ${data.margen} → descuento`)
      }
    }
  }

  console.log(`\nMigración completa. ${total} producto(s) actualizado(s).`)
}

migrar().catch(console.error)
