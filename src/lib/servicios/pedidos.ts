import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Pedido,
  ProductoPedido,
  EstadoPedido,
  ESTADO_A_UBICACION,
} from "@/types";

const COLECCION = "pedidos";
const SUBCOLECCION_PRODUCTOS = "productos";

// ─── Pedidos ───

export async function obtenerPedidos(): Promise<Pedido[]> {
  const q = query(
    collection(db, COLECCION),
    orderBy("fechaCreacion", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Pedido[];
}

export async function obtenerPedidosPorEstado(
  estado: EstadoPedido
): Promise<Pedido[]> {
  const q = query(
    collection(db, COLECCION),
    where("estado", "==", estado),
    orderBy("fechaCreacion", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Pedido[];
}

export async function obtenerPedido(id: string): Promise<Pedido | null> {
  const docRef = doc(db, COLECCION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Pedido;
}

export async function crearPedido(
  datos: Omit<
    Pedido,
    "id" | "fechaCreacion" | "actualizadoEn" | "estado" | "ubicacion"
  >
): Promise<string> {
  const docRef = await addDoc(collection(db, COLECCION), {
    ...datos,
    estado: "borrador" as EstadoPedido,
    ubicacion: "tienda",
    fechaCreacion: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return docRef.id;
}

export async function actualizarPedido(
  id: string,
  datos: Partial<Omit<Pedido, "id" | "fechaCreacion">>
): Promise<void> {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, {
    ...datos,
    actualizadoEn: serverTimestamp(),
  });
}

export async function avanzarEstadoPedido(
  id: string,
  nuevoEstado: EstadoPedido,
  ubicacion: string
): Promise<void> {
  const docRef = doc(db, COLECCION, id);
  const datosActualizar: Record<string, unknown> = {
    estado: nuevoEstado,
    ubicacion,
    actualizadoEn: serverTimestamp(),
  };

  if (nuevoEstado === "comprado") {
    datosActualizar.fechaCompra = serverTimestamp();
  }
  if (nuevoEstado === "cerrado") {
    datosActualizar.fechaCierre = serverTimestamp();
  }

  await updateDoc(docRef, datosActualizar);
}

export async function eliminarPedido(id: string): Promise<void> {
  // Primero eliminar productos del pedido
  const productosSnap = await getDocs(
    collection(db, COLECCION, id, SUBCOLECCION_PRODUCTOS)
  );
  const eliminarProductos = productosSnap.docs.map((prodDoc) =>
    deleteDoc(prodDoc.ref)
  );
  await Promise.all(eliminarProductos);

  // Luego eliminar el pedido
  const docRef = doc(db, COLECCION, id);
  await deleteDoc(docRef);
}

// ─── Productos del Pedido ───

export async function obtenerProductosPedido(
  pedidoId: string
): Promise<ProductoPedido[]> {
  const q = query(
    collection(db, COLECCION, pedidoId, SUBCOLECCION_PRODUCTOS),
    orderBy("creadoEn", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ProductoPedido[];
}

export async function agregarProducto(
  pedidoId: string,
  datos: Omit<ProductoPedido, "id" | "creadoEn">
): Promise<string> {
  const docRef = await addDoc(
    collection(db, COLECCION, pedidoId, SUBCOLECCION_PRODUCTOS),
    {
      ...datos,
      creadoEn: serverTimestamp(),
    }
  );
  return docRef.id;
}

export async function actualizarProducto(
  pedidoId: string,
  productoId: string,
  datos: Partial<Omit<ProductoPedido, "id" | "creadoEn">>
): Promise<void> {
  const docRef = doc(
    db,
    COLECCION,
    pedidoId,
    SUBCOLECCION_PRODUCTOS,
    productoId
  );
  await updateDoc(docRef, datos);
}

export async function eliminarProducto(
  pedidoId: string,
  productoId: string
): Promise<void> {
  const docRef = doc(
    db,
    COLECCION,
    pedidoId,
    SUBCOLECCION_PRODUCTOS,
    productoId
  );
  await deleteDoc(docRef);
}

// ─── Recalcular Totales del Pedido ───

export async function recalcularTotalesPedido(
  pedidoId: string
): Promise<void> {
  const productos = await obtenerProductosPedido(pedidoId);

  let montoTotal = 0;
  let gananciaTotal = 0;

  for (const prod of productos) {
    const costoProducto = prod.precioUnitario * prod.cantidad;
    montoTotal += costoProducto;
    gananciaTotal += prod.margen * prod.cantidad;
  }

  await actualizarPedido(pedidoId, { montoTotal, gananciaTotal });
}
