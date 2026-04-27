"use client";

import { create } from "zustand";
import { User } from "firebase/auth";

interface AuthState {
  usuario: User | null;
  cargando: boolean;
  setUsuario: (usuario: User | null) => void;
  setCargando: (cargando: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,
  setUsuario: (usuario) => set({ usuario }),
  setCargando: (cargando) => set({ cargando }),
}));
