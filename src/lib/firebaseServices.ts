import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Cliente, Tienda, Pedido, ProductoPedido, ArticuloTienda, Venta } from "./types"

function ts() {
  return serverTimestamp() as Timestamp
}

export const clientesService = {
  async listar(): Promise<Cliente[]> {
    const q = query(collection(db, "clientes"), orderBy("nombre"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cliente))
  },

  async obtener(id: string): Promise<Cliente | null> {
    const snap = await getDoc(doc(db, "clientes", id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Cliente) : null
  },

  async crear(data: Omit<Cliente, "id" | "creadoEn" | "actualizadoEn">) {
    return addDoc(collection(db, "clientes"), {
      ...data,
      creadoEn: ts(),
      actualizadoEn: ts(),
    })
  },

  async actualizar(id: string, data: Partial<Cliente>) {
    return updateDoc(doc(db, "clientes", id), { ...data, actualizadoEn: ts() })
  },

  async eliminar(id: string) {
    return deleteDoc(doc(db, "clientes", id))
  },
}

export const tiendasService = {
  async listar(): Promise<Tienda[]> {
    const q = query(collection(db, "tiendas"), orderBy("nombre"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tienda))
  },

  async obtener(id: string): Promise<Tienda | null> {
    const snap = await getDoc(doc(db, "tiendas", id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Tienda) : null
  },

  async crear(data: Omit<Tienda, "id" | "creadoEn" | "actualizadoEn">) {
    return addDoc(collection(db, "tiendas"), {
      ...data,
      creadoEn: ts(),
      actualizadoEn: ts(),
    })
  },

  async actualizar(id: string, data: Partial<Tienda>) {
    return updateDoc(doc(db, "tiendas", id), { ...data, actualizadoEn: ts() })
  },

  async eliminar(id: string) {
    return deleteDoc(doc(db, "tiendas", id))
  },
}

export const pedidosService = {
  async listar(): Promise<Pedido[]> {
    const q = query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido))
  },

  async listarPorEstado(estado: string): Promise<Pedido[]> {
    const q = query(collection(db, "pedidos"), where("estado", "==", estado), orderBy("fechaCreacion", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido))
  },

  async obtener(id: string): Promise<Pedido | null> {
    const snap = await getDoc(doc(db, "pedidos", id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Pedido) : null
  },

  async crear(data: Omit<Pedido, "id" | "fechaCreacion" | "actualizadoEn">) {
    return addDoc(collection(db, "pedidos"), {
      ...data,
      fechaCreacion: ts(),
      actualizadoEn: ts(),
    })
  },

  async actualizar(id: string, data: Partial<Pedido>) {
    return updateDoc(doc(db, "pedidos", id), { ...data, actualizadoEn: ts() })
  },

  async eliminar(id: string) {
    return deleteDoc(doc(db, "pedidos", id))
  },

  async avanzarEstado(id: string, nuevoEstado: string) {
    const updates: Partial<Pedido> = { estado: nuevoEstado, actualizadoEn: ts() }
    if (nuevoEstado === "comprado") updates.fechaCompra = ts()
    if (nuevoEstado === "cerrado") updates.fechaCierre = ts()
    return updateDoc(doc(db, "pedidos", id), updates)
  },
}

export const productosService = {
  ref(pedidoId: string) {
    return collection(db, "pedidos", pedidoId, "productos")
  },

  async listar(pedidoId: string): Promise<ProductoPedido[]> {
    const q = query(this.ref(pedidoId), orderBy("creadoEn"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductoPedido))
  },

  async agregar(pedidoId: string, data: Omit<ProductoPedido, "id" | "creadoEn">) {
    return addDoc(this.ref(pedidoId), { ...data, creadoEn: ts() })
  },

  async actualizar(pedidoId: string, productoId: string, data: Partial<ProductoPedido>) {
    return updateDoc(doc(this.ref(pedidoId), productoId), data)
  },

  async eliminar(pedidoId: string, productoId: string) {
    return deleteDoc(doc(this.ref(pedidoId), productoId))
  },
}

export const inventarioService = {
  async listar(): Promise<ArticuloTienda[]> {
    const q = query(collection(db, "inventario"), orderBy("creadoEn", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticuloTienda))
  },

  async obtener(id: string): Promise<ArticuloTienda | null> {
    const snap = await getDoc(doc(db, "inventario", id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as ArticuloTienda) : null
  },

  async crear(data: Omit<ArticuloTienda, "id" | "creadoEn" | "actualizadoEn">) {
    return addDoc(collection(db, "inventario"), {
      ...data,
      creadoEn: ts(),
      actualizadoEn: ts(),
    })
  },

  async actualizar(id: string, data: Partial<ArticuloTienda>) {
    return updateDoc(doc(db, "inventario", id), { ...data, actualizadoEn: ts() })
  },

  async eliminar(id: string) {
    return deleteDoc(doc(db, "inventario", id))
  },
}

export const ventasService = {
  ref: collection(db, "ventas"),

  async listar(): Promise<Venta[]> {
    const q = query(this.ref, orderBy("creadoEn", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta))
  },

  async crear(data: Omit<Venta, "id" | "creadoEn" | "actualizadoEn">) {
    return addDoc(this.ref, {
      ...data,
      creadoEn: ts(),
      actualizadoEn: ts(),
    })
  },
}

export async function obtenerPedidosPorCliente(clienteId: string): Promise<Pedido[]> {
  const q = query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"))
  const snap = await getDocs(q)
  const todos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido))

  const conProductos = await Promise.all(
    todos.map(async (pedido) => {
      const prods = await productosService.listar(pedido.id)
      const tieneCliente = prods.some((p) => p.clienteRef === clienteId || p.clienteNombre === clienteId)
      return tieneCliente ? pedido : null
    })
  )

  return conProductos.filter((p): p is Pedido => p !== null)
}
