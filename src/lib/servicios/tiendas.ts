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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tienda } from "@/types";

const COLECCION = "tiendas";

export async function obtenerTiendas(): Promise<Tienda[]> {
  const q = query(collection(db, COLECCION), orderBy("nombre", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Tienda[];
}

export async function obtenerTienda(id: string): Promise<Tienda | null> {
  const docRef = doc(db, COLECCION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Tienda;
}

export async function crearTienda(
  datos: Omit<Tienda, "id" | "creadoEn" | "actualizadoEn">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLECCION), {
    ...datos,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
  return docRef.id;
}

export async function actualizarTienda(
  id: string,
  datos: Partial<Omit<Tienda, "id" | "creadoEn">>
): Promise<void> {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, {
    ...datos,
    actualizadoEn: serverTimestamp(),
  });
}

export async function eliminarTienda(id: string): Promise<void> {
  const docRef = doc(db, COLECCION, id);
  await deleteDoc(docRef);
}
