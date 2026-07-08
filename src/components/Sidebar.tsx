"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, Users, Store, Archive, LayoutPanelTop, Receipt, LogOut, BarChart3, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { ToggleTema } from "./ToggleTema"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

const secciones = [
  {
    titulo: "Global",
    enlaces: [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    ],
  },
  {
    titulo: "Gestión",
    enlaces: [
      { href: "/pedidos/panel", label: "Panel", icon: LayoutDashboard },
      { href: "/pedidos", label: "Pedidos", icon: Package },
      { href: "/pedidos/historial", label: "Historial", icon: History },
    ],
  },
  {
    titulo: "Tienda",
    enlaces: [
      { href: "/tienda", label: "Panel", icon: LayoutPanelTop },
      { href: "/inventario", label: "Inventario", icon: Archive },
      { href: "/ventas", label: "Historial", icon: Receipt },
    ],
  },
  {
    titulo: "Registro",
    enlaces: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/tiendas", label: "Tiendas", icon: Store },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const cerrarSesion = async () => {
    await auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="hidden lg:flex flex-col w-[240px] min-h-screen border-r bg-background/50 backdrop-blur-xl fixed left-0 top-0 z-40">
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-black text-lg">M</span>
        </div>
        <span className="font-bold text-lg tracking-tight">Müv</span>
      </div>

      <nav className="flex-1 px-3 space-y-6">
        {secciones.map(({ titulo, enlaces }) => (
          <div key={titulo} className="space-y-1">
            <p className="typography-label text-muted-foreground/60 px-3">{titulo}</p>
            {enlaces.map(({ href, label, icon: Icon }) => {
              const activo = pathname === href || (() => {
                if (!pathname.startsWith(href + "/")) return false
                const sgte = pathname.slice((href + "/").length).split("/")[0]
                return sgte !== "historial" && sgte !== "panel"
              })()
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    activo
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t space-y-1">
        <ToggleTema />
        <button
          onClick={cerrarSesion}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
