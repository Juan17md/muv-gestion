import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { ejecutarBackup } from "@/lib/backupFirestore"
import { comprobarRateLimit, obtenerIpCliente } from "@/lib/rateLimit"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export const LIMITE_BACKUP_POR_HORA = 10
const VENTANA_BACKUP_MS = 60 * 60 * 1000

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 })
  }

  const ip = obtenerIpCliente(request.headers)
  const limite = comprobarRateLimit(ip, LIMITE_BACKUP_POR_HORA, VENTANA_BACKUP_MS)

  if (!limite.permitido) {
    return NextResponse.json(
      { error: "Demasiadas peticiones" },
      {
        status: 429,
        headers: {
          "Retry-After": String(limite.retryAfterSegundos),
          "X-RateLimit-Limit": String(LIMITE_BACKUP_POR_HORA),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  const header = request.headers.get("authorization")
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const resultado = await ejecutarBackup()

  if (!resultado.ok) {
    Sentry.captureException(new Error(resultado.error ?? "El backup falló"), {
      extra: { resultado },
    })
    return NextResponse.json(resultado, { status: 500 })
  }

  return NextResponse.json(resultado)
}
