"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { useAuthStore } from "@/store/authStore"
import { UID_AUTORIZADO } from "@/lib/constants"
import { Loader2 } from "lucide-react"

const TIMEOUT_MS = 6000

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, loading, error] = useAuthState(auth)
  const [vencido, setVencido] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    if (loading && !vencido) {
      const timer = setTimeout(() => setVencido(true), TIMEOUT_MS)
      return () => clearTimeout(timer)
    }
  }, [loading, vencido])

  useEffect(() => {
    setUser(user ?? null)
    setLoading(loading && !vencido)

    if (vencido || (!loading && !user && pathname !== "/login")) {
      router.push("/login")
      return
    }

    if (!loading && user && UID_AUTORIZADO && user.uid !== UID_AUTORIZADO) {
      auth.signOut()
      router.push("/login?error=no-autorizado")
    }
  }, [user, loading, vencido, pathname, router, setUser, setLoading])

  if (loading && !vencido) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    console.error("[AuthGuard] Firebase Auth error:", error)
  }

  if (!user && pathname !== "/login") return null

  return <>{children}</>
}
