"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { useAuthStore } from "@/store/authStore"
import { UID_AUTORIZADO } from "@/lib/constants"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, loading] = useAuthState(auth)
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    setUser(user ?? null)
    setLoading(loading)

    if (!loading && !user && pathname !== "/login") {
      router.push("/login")
    }

    if (!loading && user && UID_AUTORIZADO && user.uid !== UID_AUTORIZADO) {
      auth.signOut()
      router.push("/login?error=no-autorizado")
    }
  }, [user, loading, pathname, router, setUser, setLoading])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user && pathname !== "/login") return null

  return <>{children}</>
}
