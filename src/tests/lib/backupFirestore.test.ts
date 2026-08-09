import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  ejecutarBackup,
  serializarValor,
  obtenerAccessToken,
  obtenerOCrearCarpeta,
  subirArchivoDrive,
  listarBackupsDrive,
  limpiarBackupsAntiguos,
  MAX_BACKUPS,
} from "@/lib/backupFirestore"

const { mockGzip } = vi.hoisted(() => ({ mockGzip: vi.fn() }))
const mockFetch = vi.fn()

const mockListCollections = vi.fn()

vi.mock("firebase-admin/app", () => ({
  getApps: () => [],
  initializeApp: vi.fn(),
  cert: vi.fn(() => ({})),
}))

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    listCollections: mockListCollections,
  }),
}))

vi.mock("zlib", () => ({
  gzipSync: (datos: string) => {
    mockGzip(datos)
    return new Uint8Array([1, 2, 3])
  },
}))

beforeEach(() => {
  mockFetch.mockReset()
  mockGzip.mockReset()
  mockListCollections.mockReset()
  vi.stubGlobal("fetch", mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("serializarValor", () => {
  it("convierte objetos con toDate a marca de fecha", () => {
    const fecha = new Date("2026-08-08T12:00:00Z")
    const resultado = serializarValor({ toDate: () => fecha })
    expect(resultado).toEqual({ __tipo: "fecha", valor: "2026-08-08T12:00:00.000Z" })
  })

  it("recorre arrays y objetos anidados", () => {
    const fecha = { toDate: () => new Date("2026-01-01T00:00:00Z") }
    const resultado = serializarValor({ lista: [fecha, 42], texto: "hola" })
    expect(resultado).toEqual({
      lista: [{ __tipo: "fecha", valor: "2026-01-01T00:00:00.000Z" }, 42],
      texto: "hola",
    })
  })

  it("deja intactos los primitivos", () => {
    expect(serializarValor(7)).toBe(7)
    expect(serializarValor("abc")).toBe("abc")
    expect(serializarValor(null)).toBe(null)
  })
})

describe("obtenerAccessToken", () => {
  it("renueva el token con el refresh token y devuelve access_token", async () => {
    vi.stubEnv("GOOGLE_DRIVE_REFRESH_TOKEN", "refresh-123")
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "token-nuevo" }),
    })

    const token = await obtenerAccessToken()

    expect(token).toBe("token-nuevo")
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://oauth2.googleapis.com/token")
    expect(init.body.get("refresh_token")).toBe("refresh-123")
    expect(init.body.get("grant_type")).toBe("refresh_token")
  })

  it("lanza error si no hay refresh token configurado", async () => {
    await expect(obtenerAccessToken()).rejects.toThrow("GOOGLE_DRIVE_REFRESH_TOKEN")
  })

  it("lanza error si la respuesta del token no es ok", async () => {
    vi.stubEnv("GOOGLE_DRIVE_REFRESH_TOKEN", "refresh-123")
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid_grant",
    })

    await expect(obtenerAccessToken()).rejects.toThrow(/400/)
  })
})

describe("obtenerOCrearCarpeta", () => {
  it("devuelve el id de la carpeta existente", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [{ id: "carpeta-1" }] }),
    })

    const id = await obtenerOCrearCarpeta("token")

    expect(id).toBe("carpeta-1")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("crea la carpeta si no existe", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "carpeta-nueva" }),
      })

    const id = await obtenerOCrearCarpeta("token")

    expect(id).toBe("carpeta-nueva")
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [url, init] = mockFetch.mock.calls[1]
    expect(url).toBe("https://www.googleapis.com/drive/v3/files")
    expect(init.method).toBe("POST")
  })

  it("lanza error si falla la busqueda", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })
    await expect(obtenerOCrearCarpeta("token")).rejects.toThrow(/403/)
  })
})

describe("subirArchivoDrive", () => {
  it("sube el archivo con multipart y devuelve el resultado", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "archivo-1", name: "muv-firestore-2026-08-08.json.gz" }),
    })

    const resultado = await subirArchivoDrive("token", "carpeta-1", "muv-firestore-2026-08-08.json.gz", new Uint8Array([1]))

    expect(resultado.name).toContain("muv-firestore")
    const [url, init] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string>; body: unknown }]
    expect(url).toContain("uploadType=multipart")
    expect(init.headers.Authorization).toBe("Bearer token")
    expect(init.body).toBeInstanceOf(FormData)
  })

  it("lanza error si la subida falla", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "unauthorized" })
    await expect(
      subirArchivoDrive("token", "carpeta-1", "archivo.json.gz", new Uint8Array([1]))
    ).rejects.toThrow(/401/)
  })
})

describe("listarBackupsDrive / limpiarBackupsAntiguos", () => {
  it("listar devuelve los backups de la carpeta", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { id: "b1", name: "muv-firestore-a.json.gz" },
          { id: "b2", name: "muv-firestore-b.json.gz" },
        ],
      }),
    })

    const archivos = await listarBackupsDrive("token", "carpeta-1")

    expect(archivos).toHaveLength(2)
    expect(mockFetch.mock.calls[0][0]).toContain("carpeta-1")
  })

  it("elimina los backups que exceden el maximo", async () => {
    const files = Array.from({ length: MAX_BACKUPS + 2 }, (_, i) => ({
      id: `b${i}`,
      name: `muv-firestore-${i}.json.gz`,
    }))

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files }) })
      .mockResolvedValue({ ok: true, json: async () => ({}) })

    const eliminados = await limpiarBackupsAntiguos("token", "carpeta-1")

    expect(eliminados).toBe(2)
    const llamadasBorrado = mockFetch.mock.calls.filter(([, init]) => init?.method === "DELETE")
    expect(llamadasBorrado).toHaveLength(2)
  })

  it("no elimina nada si hay menos backups que el maximo", async () => {
    const files = [
      { id: "b1", name: "muv-firestore-1.json.gz" },
      { id: "b2", name: "muv-firestore-2.json.gz" },
    ]
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ files }) })

    const eliminados = await limpiarBackupsAntiguos("token", "carpeta-1")

    expect(eliminados).toBe(0)
  })
})

describe("ejecutarBackup", () => {
  it("falla de forma segura si no hay credencial de servicio", async () => {
    const resultado = await ejecutarBackup()
    expect(resultado.ok).toBe(false)
    expect(resultado.error).toContain("FIREBASE_SERVICE_ACCOUNT")
  })

  it("comprime y sube el backup completo a Drive", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", JSON.stringify({ project_id: "muv-gestion" }))
    vi.stubEnv("GOOGLE_DRIVE_REFRESH_TOKEN", "refresh-123")

    mockListCollections.mockResolvedValue([
      {
        get: async () => ({
          docs: [
            {
              ref: { path: "clientes/c1", listCollections: async () => [] },
              id: "c1",
              data: () => ({ nombre: "Ana", creadoEn: { toDate: () => new Date("2026-08-08T00:00:00Z") } }),
            },
          ],
        }),
      },
    ])

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token-nuevo" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: "carpeta-1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "archivo-1", name: "muv-firestore-2026-08-08.json.gz" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      })

    const resultado = await ejecutarBackup()

    expect(mockGzip).toHaveBeenCalled()
    expect(resultado.ok).toBe(true)
    expect(resultado.documentos).toBe(1)
    expect(resultado.archivo).toContain("muv-firestore")
    expect(resultado.drive).toBe("Muv-Backups/")
  })
})
