"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";

export default function RootPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuthStore();

  useEffect(() => {
    if (!cargando) {
      if (usuario) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [usuario, cargando, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground text-sm">
        Cargando...
      </div>
    </div>
  );
}
