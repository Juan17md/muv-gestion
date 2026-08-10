const registros = new Map<string, number[]>()

const MAX_ENTRADAS_BARRIDO = 10_000

export interface ResultadoRateLimit {
  permitido: boolean
  restantes: number
  retryAfterSegundos: number
}

export function obtenerIpCliente(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for")
  if (vercel) return vercel.split(",")[0]!.trim()
  const forward = headers.get("x-forwarded-for")
  if (forward) return forward.split(",")[0]!.trim()
  const real = headers.get("x-real-ip")
  if (real) return real.trim()
  return "desconocida"
}

export function comprobarRateLimit(
  clave: string,
  limite: number,
  ventanaMs: number,
): ResultadoRateLimit {
  const ahora = Date.now()
  const timestamps = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs)

  if (timestamps.length >= limite) {
    const masAntiguo = timestamps[0]!
    registros.set(clave, timestamps)
    return {
      permitido: false,
      restantes: 0,
      retryAfterSegundos: Math.ceil((masAntiguo + ventanaMs - ahora) / 1000),
    }
  }

  timestamps.push(ahora)
  registros.set(clave, timestamps)

  if (registros.size > MAX_ENTRADAS_BARRIDO) {
    for (const [k, v] of registros) {
      if (v.length === 0) registros.delete(k)
    }
  }

  return {
    permitido: true,
    restantes: limite - timestamps.length,
    retryAfterSegundos: 0,
  }
}

export function limpiarRateLimit() {
  registros.clear()
}
