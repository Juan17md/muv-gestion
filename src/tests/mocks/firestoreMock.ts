import { vi } from "vitest"

type Doc = { id: string; data: Record<string, unknown> }

const colecciones = new Map<string, Map<string, Doc>>()
const listeners = new Map<string, Set<(snap: unknown) => void>>()
let contadorIds = 0

export function sembrarDatos(coleccion: string, docs: Record<string, Record<string, unknown>>) {
  const mapa = colecciones.get(coleccion) ?? new Map<string, Doc>()
  for (const [id, data] of Object.entries(docs)) {
    mapa.set(id, { id, data: { ...data } })
  }
  colecciones.set(coleccion, mapa)
}

export function limpiarDatos() {
  colecciones.clear()
  listeners.clear()
  contadorIds = 0
}

export function obtenerDatos(coleccion: string): Doc[] {
  return [...(colecciones.get(coleccion)?.values() ?? [])]
}

export function obtenerDoc(coleccion: string, id: string): Doc | undefined {
  return colecciones.get(coleccion)?.get(id)
}

function notificar(coleccion: string) {
  const l = listeners.get(coleccion)
  if (!l) return
  for (const cb of l) cb(snapshotDeColeccion(coleccion))
}

function snapshotDeColeccion(coleccion: string, docsFiltrados?: Doc[]) {
  const docs = docsFiltrados ?? [...(colecciones.get(coleccion)?.values() ?? [])]
  return {
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
    size: docs.length,
    empty: docs.length === 0,
  }
}

function aplicarWhere(docs: Doc[], constraints: Array<Record<string, unknown>>): Doc[] {
  return docs.filter((d) => {
    for (const c of constraints) {
      if (c.tipo !== "where") continue
      const { campo, op, valor } = c as { campo: string; op: string; valor: unknown }
      const dato = d.data[campo] ?? null
      if (op === "==" && dato !== valor) return false
      if (op === "!=" && dato === valor) return false
      if (op === ">" && !(dato != null && (dato as number) > (valor as number))) return false
      if (op === "<" && !(dato != null && (dato as number) < (valor as number))) return false
      if (op === ">=" && !(dato != null && (dato as number) >= (valor as number))) return false
      if (op === "<=" && !(dato != null && (dato as number) <= (valor as number))) return false
      if (op === "array-contains" && !(Array.isArray(dato) && (dato as unknown[]).includes(valor))) return false
    }
    return true
  })
}

function aplicarOrderBy(docs: Doc[], constraints: Array<Record<string, unknown>>): Doc[] {
  return [...docs].sort((a, b) => {
    for (const c of constraints) {
      if (c.tipo !== "orderBy") continue
      const { campo, dir } = c as { campo: string; dir?: "asc" | "desc" }
      const av = a.data[campo] ?? null
      const bv = b.data[campo] ?? null
      if (av === bv) continue
      const comparacion =
        av == null ? -1 : bv == null ? 1 : (av as number) > (bv as number) ? 1 : -1
      return dir === "desc" ? -comparacion : comparacion
    }
    return 0
  })
}

function rutaDeRef(ref: { ruta?: string; tipo?: string }) {
  return ref.ruta ?? ""
}

export const collection = vi.fn((_db: unknown, ...segmentos: Array<string | unknown>) => {
  const partes: string[] = []
  if (typeof _db === "object" && _db !== null && (_db as { ruta?: string }).ruta) {
    partes.push((_db as { ruta: string }).ruta)
  }
  partes.push(...segmentos.map(String))
  const ruta = partes.join("/")
  return { tipo: "coleccion", ruta }
})

export const doc = vi.fn((_db: unknown, ...segmentos: Array<string | unknown>) => {
  const partes: string[] = []
  if (typeof _db === "object" && _db !== null && (_db as { ruta?: string }).ruta) {
    partes.push((_db as { ruta: string }).ruta)
  }
  partes.push(...segmentos.map(String))
  const ruta = partes.join("/")
  return { tipo: "documento", ruta }
})

export const query = vi.fn((ref: { ruta: string }, ...constraints: Array<Record<string, unknown>>) => {
  return { ...ref, constraints }
})

export const orderBy = vi.fn((campo: string, dir: "asc" | "desc" = "asc") => ({ tipo: "orderBy", campo, dir }))

export const where = vi.fn((campo: string, op: string, valor: unknown) => ({ tipo: "where", campo, op, valor }))

export const getDocs = vi.fn(async (q: { ruta?: string; id?: string; constraints?: Array<Record<string, unknown>> }) => {
  const ruta = q.ruta ?? q.id ?? ""
  let docs = [...(colecciones.get(ruta)?.values() ?? [])]
  if (q.constraints) {
    docs = aplicarWhere(docs, q.constraints)
    docs = aplicarOrderBy(docs, q.constraints)
  }
  return snapshotDeColeccion(ruta, docs)
})

export const getDoc = vi.fn(async (docRef: { ruta: string }) => {
  const ruta = rutaDeRef(docRef)
  const partes = ruta.split("/")
  const id = partes[partes.length - 1]
  const coleccion = partes.slice(0, -1).join("/")
  const d = colecciones.get(coleccion)?.get(id)
  return {
    id: id ?? "",
    exists: () => Boolean(d),
    data: () => d?.data ?? {},
  }
})

export const addDoc = vi.fn(async (collRef: { ruta?: string; id?: string }, data: Record<string, unknown>) => {
  const ruta = rutaDeRef(collRef) || (collRef.id as string)
  const mapa = colecciones.get(ruta) ?? new Map<string, Doc>()
  contadorIds += 1
  const id = `mock-id-${contadorIds}`
  mapa.set(id, { id, data: { ...data } })
  colecciones.set(ruta, mapa)
  notificar(ruta)
  return { id }
})

export const updateDoc = vi.fn(async (docRef: { ruta: string }, data: Record<string, unknown>) => {
  const ruta = rutaDeRef(docRef)
  const partes = ruta.split("/")
  const id = partes[partes.length - 1]
  const coleccion = partes.slice(0, -1).join("/")
  const mapa = colecciones.get(coleccion)
  const existente = mapa?.get(id)
  if (existente) existente.data = { ...existente.data, ...data }
  notificar(coleccion)
})

export const deleteDoc = vi.fn(async (docRef: { ruta: string }) => {
  const ruta = rutaDeRef(docRef)
  const partes = ruta.split("/")
  const id = partes[partes.length - 1]
  const coleccion = partes.slice(0, -1).join("/")
  colecciones.get(coleccion)?.delete(id)
  notificar(coleccion)
})

export const serverTimestamp = vi.fn(() => ({
  segundos: Math.floor(Date.now() / 1000),
  nanosegundos: 0,
}))

class TimestampMock {
  constructor(
    public seconds: number,
    public nanoseconds: number = 0
  ) {}

  toDate() {
    return new Date(this.seconds * 1000)
  }

  toMillis() {
    return this.seconds * 1000
  }

  static now() {
    return new TimestampMock(Math.floor(Date.now() / 1000))
  }

  static fromDate(date: Date) {
    return new TimestampMock(Math.floor(date.getTime() / 1000))
  }
}

export const Timestamp = TimestampMock

export const onSnapshot = vi.fn((ref: { ruta: string; tipo?: string }, cb: (snap: unknown) => void) => {
  const ruta = rutaDeRef(ref)
  const parteDoc = ref.tipo === "documento"
  if (parteDoc) {
    const partes = ruta.split("/")
    const id = partes[partes.length - 1]
    const coleccion = partes.slice(0, -1).join("/")
    const d = colecciones.get(coleccion)?.get(id)
    cb({
      id,
      exists: () => Boolean(d),
      data: () => d?.data ?? {},
    })
    const l = listeners.get(coleccion) ?? new Set()
    const wrapper = () => {
      const docActual = colecciones.get(coleccion)?.get(id)
      cb({
        id,
        exists: () => Boolean(docActual),
        data: () => docActual?.data ?? {},
      })
    }
    l.add(wrapper)
    listeners.set(coleccion, l)
    return () => {
      l.delete(wrapper)
    }
  }
  cb(snapshotDeColeccion(ruta))
  const l = listeners.get(ruta) ?? new Set()
  l.add(cb)
  listeners.set(ruta, l)
  return () => {
    l.delete(cb)
  }
})

export const limpiarMocks = vi.fn(() => {
  for (const fn of [collection, doc, query, orderBy, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp]) {
    fn.mockClear()
  }
})
