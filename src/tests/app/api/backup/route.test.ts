import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { GET, LIMITE_BACKUP_POR_HORA } from "@/app/api/backup/route"
import { limpiarRateLimit } from "@/lib/rateLimit"

const { mockEjecutarBackup, mockCaptureException } = vi.hoisted(() => ({
  mockEjecutarBackup: vi.fn(),
  mockCaptureException: vi.fn(),
}))

vi.mock("@/lib/backupFirestore", () => ({
  ejecutarBackup: mockEjecutarBackup,
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}))

const SECRET = "secret-de-prueba"

function peticion(authorization?: string): Request {
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.10" }
  if (authorization) headers.authorization = authorization
  return new Request("http://localhost/api/backup", { headers })
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET)
  limpiarRateLimit()
  mockEjecutarBackup.mockReset()
  mockEjecutarBackup.mockResolvedValue({ ok: true, documentos: 186 })
  mockCaptureException.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  limpiarRateLimit()
})

describe("GET /api/backup", () => {
  it("devuelve 503 si CRON_SECRET no está configurado", async () => {
    vi.stubEnv("CRON_SECRET", "")
    const respuesta = await GET(peticion(`Bearer ${SECRET}`))
    expect(respuesta.status).toBe(503)
    expect(mockEjecutarBackup).not.toHaveBeenCalled()
  })

  it("devuelve 401 sin token o con token incorrecto", async () => {
    const sinToken = await GET(peticion())
    expect(sinToken.status).toBe(401)
    expect(mockEjecutarBackup).not.toHaveBeenCalled()

    const tokenIncorrecto = await GET(peticion("Bearer incorrecto"))
    expect(tokenIncorrecto.status).toBe(401)
    expect(mockEjecutarBackup).not.toHaveBeenCalled()
  })

  it("ejecuta el backup con token correcto", async () => {
    const respuesta = await GET(peticion(`Bearer ${SECRET}`))
    expect(respuesta.status).toBe(200)
    const cuerpo = await respuesta.json()
    expect(cuerpo).toEqual({ ok: true, documentos: 186 })
    expect(mockEjecutarBackup).toHaveBeenCalledTimes(1)
  })

  it("devuelve 429 al superar el límite por IP con headers de rate limit", async () => {
    for (let i = 0; i < LIMITE_BACKUP_POR_HORA; i++) {
      const respuesta = await GET(peticion(`Bearer ${SECRET}`))
      expect(respuesta.status).toBe(200)
    }

    const bloqueada = await GET(peticion(`Bearer ${SECRET}`))
    expect(bloqueada.status).toBe(429)
    expect(bloqueada.headers.get("X-RateLimit-Limit")).toBe(String(LIMITE_BACKUP_POR_HORA))
    expect(bloqueada.headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(Number(bloqueada.headers.get("Retry-After"))).toBeGreaterThan(0)
    expect(mockEjecutarBackup).toHaveBeenCalledTimes(LIMITE_BACKUP_POR_HORA)
  })

  it("el rate limit es por IP: otra IP no está bloqueada", async () => {
    for (let i = 0; i < LIMITE_BACKUP_POR_HORA; i++) {
      await GET(peticion(`Bearer ${SECRET}`))
    }

    const otraIp = await GET(
      new Request("http://localhost/api/backup", {
        headers: {
          "x-forwarded-for": "203.0.113.99",
          authorization: `Bearer ${SECRET}`,
        },
      }),
    )
    expect(otraIp.status).toBe(200)
  })

  it("devuelve 500 si el backup falla y reporta el error a Sentry", async () => {
    mockEjecutarBackup.mockResolvedValue({ ok: false, error: "fallo de red" })
    const respuesta = await GET(peticion(`Bearer ${SECRET}`))
    expect(respuesta.status).toBe(500)
    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    const errorCapturado = mockCaptureException.mock.calls[0][0] as Error
    expect(errorCapturado.message).toBe("fallo de red")
  })
})
