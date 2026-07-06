#!/usr/bin/env node

import { createInterface } from "readline"
import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

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

function leerApiKey() {
  const envPath = join(__dirname, "..", ".env.local")
  if (!existsSync(envPath)) {
    console.error("No se encuentra .env.local")
    process.exit(1)
  }

  const contenido = readFileSync(envPath, "utf-8")
  const match = contenido.match(/^NEXT_PUBLIC_FIREBASE_API_KEY=(.+)$/m)
  if (!match) {
    console.error("NEXT_PUBLIC_FIREBASE_API_KEY no encontrada en .env.local")
    process.exit(1)
  }

  return match[1].trim()
}

async function main() {
  console.log("=== Crear usuario en Firebase Auth ===\n")

  const apiKey = leerApiKey()
  const email = await preguntar("Correo electrónico: ")
  if (!email) {
    console.error("El correo es obligatorio")
    process.exit(1)
  }

  const password = await preguntar("Contraseña (mín. 6 caracteres): ")
  if (password.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres")
    process.exit(1)
  }

  console.log("\nCreando usuario...")

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error(`Error (${res.status}): ${data.error?.message || "Desconocido"}`)
      process.exit(1)
    }

    console.log("\n✓ Usuario creado exitosamente")
    console.log(`  Email:    ${data.email}`)
    console.log(`  UID:      ${data.localId}`)
    console.log(`  Creado:   ${new Date().toLocaleString("es-ES")}`)
  } catch (err) {
    console.error("Error de conexión:", err.message)
    process.exit(1)
  }
}

main()
