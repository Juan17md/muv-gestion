import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  sembrarDatos,
  limpiarDatos,
  limpiarMocks,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "../mocks/firestoreMock"
import {
  clientesService,
  tiendasService,
  pedidosService,
  productosService,
  inventarioService,
  ventasService,
  obtenerPedidosPorCliente,
} from "@/lib/firebaseServices"
import { Timestamp } from "firebase/firestore"

const crearTimestamp = (diasAtras: number) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - diasAtras)
  return Timestamp.fromDate(fecha)
}

beforeEach(() => {
  limpiarDatos()
  limpiarMocks()
})

describe("clientesService", () => {
  it("listar devuelve los clientes ordenados por nombre", async () => {
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
      c2: { nombre: "Bruno", whatsapp: "+58 222", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const clientes = await clientesService.listar()
    expect(clientes).toHaveLength(2)
    expect(clientes[0].nombre).toBe("Ana")
    expect(clientes[0].id).toBe("c1")
  })

  it("obtener devuelve el cliente existente", async () => {
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const cliente = await clientesService.obtener("c1")
    expect(cliente).not.toBeNull()
    expect(cliente?.nombre).toBe("Ana")
  })

  it("obtener devuelve null si el cliente no existe", async () => {
    const cliente = await clientesService.obtener("inexistente")
    expect(cliente).toBeNull()
  })

  it("crear agrega un cliente con timestamps", async () => {
    const ref = await clientesService.crear({ nombre: "Carlos", whatsapp: "+58 333" })
    expect(ref.id).toBeTruthy()
    expect(addDoc).toHaveBeenCalled()
    const args = vi.mocked(addDoc).mock.calls[0]
    const data = args[1] as Record<string, unknown>
    expect(data.nombre).toBe("Carlos")
    expect(data.creadoEn).toBeDefined()
    expect(data.actualizadoEn).toBeDefined()
  })

  it("actualizar modifica el cliente y su actualizadoEn", async () => {
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", actualizadoEn: crearTimestamp(5) },
    })
    await clientesService.actualizar("c1", { whatsapp: "+58 999" })
    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "clientes/c1" }), expect.objectContaining({ whatsapp: "+58 999" }))
  })

  it("eliminar borra el cliente", async () => {
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111" },
    })
    await clientesService.eliminar("c1")
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "clientes/c1" }))
    const restantes = await clientesService.listar()
    expect(restantes).toHaveLength(0)
  })
})

describe("tiendasService", () => {
  it("listar devuelve las tiendas", async () => {
    sembrarDatos("tiendas", {
      t1: { nombre: "AliExpress", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
      t2: { nombre: "Shein", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const tiendas = await tiendasService.listar()
    expect(tiendas).toHaveLength(2)
    expect(tiendas.map((t) => t.nombre)).toEqual(["AliExpress", "Shein"])
  })

  it("obtener devuelve null para tienda inexistente", async () => {
    const tienda = await tiendasService.obtener("nope")
    expect(tienda).toBeNull()
  })

  it("crear guarda la tienda en la coleccion", async () => {
    await tiendasService.crear({ nombre: "Temu" })
    expect(addDoc).toHaveBeenCalled()
    const args = vi.mocked(addDoc).mock.calls[0]
    expect((args[0] as { ruta: string }).ruta).toBe("tiendas")
    expect((args[1] as Record<string, unknown>).nombre).toBe("Temu")
  })

  it("actualizar y eliminar llaman a Firestore con la ruta correcta", async () => {
    await tiendasService.actualizar("t1", { notas: "nueva" })
    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "tiendas/t1" }), expect.any(Object))
    await tiendasService.eliminar("t1")
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "tiendas/t1" }))
  })
})

describe("pedidosService", () => {
  it("listar devuelve los pedidos ordenados por fechaCreacion descendente", async () => {
    sembrarDatos("pedidos", {
      p1: { tiendaRef: "t1", tiendaNombre: "AliExpress", estado: "abierto", ubicacion: "China", fechaCreacion: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
      p2: { tiendaRef: "t2", tiendaNombre: "Shein", estado: "entregado_cliente", ubicacion: "VEN", fechaCreacion: crearTimestamp(2), actualizadoEn: crearTimestamp(1) },
    })
    const pedidos = await pedidosService.listar()
    expect(pedidos).toHaveLength(2)
    expect(pedidos[0].id).toBe("p1")
  })

  it("listarPorEstado filtra por estado", async () => {
    sembrarDatos("pedidos", {
      p1: { tiendaRef: "t1", tiendaNombre: "A", estado: "abierto", ubicacion: "China", fechaCreacion: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
      p2: { tiendaRef: "t2", tiendaNombre: "B", estado: "cerrado", ubicacion: "VEN", fechaCreacion: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const abiertos = await pedidosService.listarPorEstado("abierto")
    expect(abiertos).toHaveLength(1)
    expect(abiertos[0].estado).toBe("abierto")
  })

  it("obtener devuelve el pedido o null", async () => {
    sembrarDatos("pedidos", {
      p1: { tiendaRef: "t1", tiendaNombre: "A", estado: "abierto", ubicacion: "X", fechaCreacion: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const pedido = await pedidosService.obtener("p1")
    expect(pedido?.tiendaNombre).toBe("A")
    expect(await pedidosService.obtener("zzz")).toBeNull()
  })

  it("crear usa fechaCreacion propia si se provee", async () => {
    const fecha = new Date(2024, 5, 10)
    await pedidosService.crear(
      { tiendaRef: "t1", tiendaNombre: "A", estado: "borrador", ubicacion: "X" },
      fecha
    )
    const args = vi.mocked(addDoc).mock.calls[0]
    const data = args[1] as { fechaCreacion: { toDate: () => Date } }
    expect(data.fechaCreacion.toDate().toDateString()).toBe(fecha.toDateString())
  })

  it("avanzarEstado agrega fechaCompra al pasar a comprado", async () => {
    await pedidosService.avanzarEstado("p1", "comprado")
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ ruta: "pedidos/p1" }),
      expect.objectContaining({ estado: "comprado", fechaCompra: expect.anything() })
    )
  })

  it("avanzarEstado no agrega fechaCompra para otros estados", async () => {
    await pedidosService.avanzarEstado("p1", "casillero_usa")
    const args = vi.mocked(updateDoc).mock.calls[0]
    const data = args[1] as Record<string, unknown>
    expect(data.fechaCompra).toBeUndefined()
    expect(data.estado).toBe("casillero_usa")
  })
})

describe("productosService", () => {
  it("listar convierte margen en descuento cuando no existe descuento", async () => {
    sembrarDatos("pedidos/p1/productos", {
      pr1: { nombre: "Samsung S24", cantidad: 1, precioUnitario: 500, margen: 50, estadoPago: "pagado", clienteNombre: "Ana", creadoEn: crearTimestamp(1) },
      pr2: { nombre: "AirPods", cantidad: 1, precioUnitario: 100, descuento: 10, estadoPago: "sin_pagar", clienteNombre: "Bruno", creadoEn: crearTimestamp(1) },
    })
    const productos = await productosService.listar("p1")
    expect(productos).toHaveLength(2)
    const conMargen = productos.find((p) => p.nombre === "Samsung S24")
    expect(conMargen?.descuento).toBe(50)
    const conDescuento = productos.find((p) => p.nombre === "AirPods")
    expect(conDescuento?.descuento).toBe(10)
  })

  it("agregar y actualizar usan la subcoleccion del pedido", async () => {
    await productosService.agregar("p1", {
      nombre: "iPhone",
      cantidad: 1,
      precioUnitario: 900,
      estadoPago: "sin_pagar",
      clienteNombre: "Ana",
    })
    expect(addDoc).toHaveBeenCalled()
    const argsAdd = vi.mocked(addDoc).mock.calls[0]
    expect((argsAdd[0] as { ruta: string }).ruta).toBe("pedidos/p1/productos")

    await productosService.actualizar("p1", "pr9", { cantidad: 2 })
    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "pedidos/p1/productos/pr9" }), expect.objectContaining({ cantidad: 2 }))

    await productosService.eliminar("p1", "pr9")
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "pedidos/p1/productos/pr9" }))
  })
})

describe("inventarioService", () => {
  it("listar, crear, actualizar y eliminar operan sobre la coleccion inventario", async () => {
    sembrarDatos("inventario", {
      i1: { nombre: "Laptop", cantidad: 3, precioVenta: 800, costo: 600, estado: "en_stock", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const lista = await inventarioService.listar()
    expect(lista).toHaveLength(1)
    expect(lista[0].nombre).toBe("Laptop")

    await inventarioService.crear({ nombre: "Tablet", cantidad: 2, precioVenta: 300, costo: 200, estado: "en_stock" })
    expect(addDoc).toHaveBeenCalled()
    const argsAdd = vi.mocked(addDoc).mock.calls[0]
    expect((argsAdd[0] as { ruta: string }).ruta).toBe("inventario")

    await inventarioService.actualizar("i1", { cantidad: 5 })
    expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "inventario/i1" }), expect.objectContaining({ cantidad: 5 }))

    await inventarioService.eliminar("i1")
    expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ ruta: "inventario/i1" }))
  })
})

describe("ventasService", () => {
  it("listar y crear operan sobre la coleccion ventas", async () => {
    sembrarDatos("ventas", {
      v1: { articuloNombre: "Laptop", cantidad: 1, precioVenta: 800, clienteNombre: "Ana", estatusEntrega: "por_entregar", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const ventas = await ventasService.listar()
    expect(ventas).toHaveLength(1)
    expect(ventas[0].articuloNombre).toBe("Laptop")

    await ventasService.crear({
      articuloNombre: "Tablet",
      cantidad: 1,
      precioVenta: 300,
      clienteNombre: "Bruno",
      estatusEntrega: "por_entregar",
    })
    const argsAdd = vi.mocked(addDoc).mock.calls[0]
    expect((argsAdd[0] as { ruta: string }).ruta).toBe("ventas")
  })
})

describe("obtenerPedidosPorCliente", () => {
  it("devuelve solo los pedidos con productos del cliente indicado", async () => {
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    sembrarDatos("pedidos", {
      p1: { tiendaRef: "t1", tiendaNombre: "AliExpress", estado: "abierto", ubicacion: "X", fechaCreacion: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
      p2: { tiendaRef: "t2", tiendaNombre: "Shein", estado: "abierto", ubicacion: "Y", fechaCreacion: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    sembrarDatos("pedidos/p1/productos", {
      pr1: { nombre: "Samsung", cantidad: 1, precioUnitario: 500, clienteRef: "c1", estadoPago: "sin_pagar", clienteNombre: "Ana", creadoEn: crearTimestamp(1) },
    })
    sembrarDatos("pedidos/p2/productos", {
      pr2: { nombre: "AirPods", cantidad: 1, precioUnitario: 100, clienteRef: "otra", estadoPago: "sin_pagar", clienteNombre: "Bruno", creadoEn: crearTimestamp(1) },
    })

    const pedidos = await obtenerPedidosPorCliente("c1")
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].id).toBe("p1")
  })

  it("devuelve array vacio si el cliente no existe", async () => {
    const pedidos = await obtenerPedidosPorCliente("inexistente")
    expect(pedidos).toEqual([])
  })
})

describe("consistencia de getDocs con datos sembrados", () => {
  it("getDocs refleja los datos sembrados en la coleccion", async () => {
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 1", creadoEn: crearTimestamp(1), actualizadoEn: crearTimestamp(1) },
    })
    const snap = await getDocs({ ruta: "clientes", constraints: [] })
    expect(snap.docs).toHaveLength(1)
    expect(snap.docs[0].id).toBe("c1")
    expect(snap.docs[0].data().nombre).toBe("Ana")
  })
})
