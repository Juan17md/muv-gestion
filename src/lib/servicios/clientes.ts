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
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Cliente } from "@/types";

const COLECCION = "clientes";

export async function obtenerClientes(): Promise<Cliente[]> {
  const q = query(collection(db, COLECCION), orderBy("nombre", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Cliente[];
}

export async function obtenerCliente(id: string): Promise<Cliente | null> {
  const docRef = doc(db, COLECCION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Cliente;
}

export async function crearCliente(
  datos: Omit<Cliente, "id" | "creadoEn" | "actualizadoEn">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLECCION), {
    ...datos,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return docRef.id;
}

export async function actualizarCliente(
  id: string,
  datos: Partial<Omit<Cliente, "id" | "creadoEn">>
): Promise<void> {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, {
    ...datos,
    actualizadoEn: serverTimestamp(),
  });
}

export async function eliminarCliente(id: string): Promise<void> {
  const docRef = doc(db, COLECCION, id);
  await deleteDoc(docRef);
}
