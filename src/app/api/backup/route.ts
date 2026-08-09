import { NextResponse } from "next/server"
import { ejecutarBackup } from "@/lib/backupFirestore"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function estaAutorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const header = request.headers.get("authorization")
  return header === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!estaAutorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const resultado = await ejecutarBackup()

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 500 })
  }

  return NextResponse.json(resultado)
}
