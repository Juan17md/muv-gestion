"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const setCargando = useAuthStore((s) => s.setCargando);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [setUsuario, setCargando]);

  return <>{children}</>;
}
