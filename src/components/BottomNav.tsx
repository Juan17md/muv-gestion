"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Users, Store, Archive, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { ToggleTema } from "./ToggleTema"

const enlaces = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/inventario", label: "Inventario", icon: Archive },
  { href: "/tiendas", label: "Tiendas", icon: Store },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const cerrarSesion = async () => {
    await auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {enlaces.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors duration-200",
                activo ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <div className="flex flex-col items-center gap-0.5 px-3 py-1.5">
          <ToggleTema />
        </div>
        <button
          onClick={cerrarSesion}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Salir</span>
        </button>
      </div>
    </nav>
  )
}
