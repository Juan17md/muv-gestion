import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  comprobarRateLimit,
  obtenerIpCliente,
  limpiarRateLimit,
} from "@/lib/rateLimit"

const VENTANA_MS = 60 * 60 * 1000

beforeEach(() => {
  limpiarRateLimit()
})

describe("obtenerIpCliente", () => {
  it("usa x-vercel-forwarded-for en primer lugar", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.1, 198.51.100.2",
      "x-forwarded-for": "198.51.100.2",
    })
    expect(obtenerIpCliente(headers)).toBe("203.0.113.1")
  })

  it("toma la primera IP de x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9, 198.51.100.7" })
    expect(obtenerIpCliente(headers)).toBe("203.0.113.9")
  })

  it("usa x-real-ip como fallback", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.55" })
    expect(obtenerIpCliente(headers)).toBe("203.0.113.55")
  })

  it("devuelve 'desconocida' sin headers de IP", () => {
    expect(obtenerIpCliente(new Headers())).toBe("desconocida")
  })
})

describe("comprobarRateLimit", () => {
  it("permite hasta el límite de peticiones", () => {
    for (let i = 0; i < 10; i++) {
      const resultado = comprobarRateLimit("ip-1", 10, VENTANA_MS)
      expect(resultado.permitido).toBe(true)
      expect(resultado.restantes).toBe(10 - i - 1)
    }
  })

  it("bloquea al superar el límite y calcula retryAfter", () => {
    for (let i = 0; i < 10; i++) {
      comprobarRateLimit("ip-2", 10, VENTANA_MS)
    }
    const resultado = comprobarRateLimit("ip-2", 10, VENTANA_MS)
    expect(resultado.permitido).toBe(false)
    expect(resultado.restantes).toBe(0)
    expect(resultado.retryAfterSegundos).toBeGreaterThan(0)
    expect(resultado.retryAfterSegundos).toBeLessThanOrEqual(Math.ceil(VENTANA_MS / 1000))
  })

  it("aplica la ventana por IP de forma independiente", () => {
    for (let i = 0; i < 10; i++) {
      comprobarRateLimit("ip-saturada", 10, VENTANA_MS)
    }
    expect(comprobarRateLimit("ip-saturada", 10, VENTANA_MS).permitido).toBe(false)
    expect(comprobarRateLimit("ip-otra", 10, VENTANA_MS).permitido).toBe(true)
  })

  it("permite nuevamente cuando expira la ventana", () => {
    const ahoraReal = Date.now
    let reloj = 1_000_000
    vi.stubGlobal("Date", class extends Date {
      constructor() {
        super()
        return new Date(reloj) as unknown as Date
      }
      static now() {
        return reloj
      }
    })

    for (let i = 0; i < 10; i++) {
      comprobarRateLimit("ip-vencida", 10, VENTANA_MS)
    }
    expect(comprobarRateLimit("ip-vencida", 10, VENTANA_MS).permitido).toBe(false)

    reloj = reloj + VENTANA_MS + 1000
    expect(comprobarRateLimit("ip-vencida", 10, VENTANA_MS).permitido).toBe(true)

    vi.unstubAllGlobals()
    Date.now = ahoraReal
  })
})
