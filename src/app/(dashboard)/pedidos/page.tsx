"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatearMoneda, formatearFecha, ESTADOS_PEDIDO, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, ShoppingCart, Package, ArrowRight } from "lucide-react"
import type { Pedido } from "@/lib/types"

const FILTROS_ESTADO = [
  { valor: "todos", etiqueta: "Todos" },
  ...ESTADOS_PEDIDO.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })),
]

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido)))
      setLoading(false)
    })
    return unsub
  }, [])

  const filtrados = pedidos.filter((p) => {
    if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      if (!p.tiendaNombre.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="typography-label text-primary">Gestión</p>
          <h1 className="typography-title-premium">Pedidos</h1>
        </div>
        <Link href="/pedidos/nuevo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tienda..."
            className="pl-10"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroEstado(f.valor)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                filtroEstado === f.valor
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="card-glow">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))
          : filtrados.map((pedido, idx) => {
              const estadoInfo = ESTADOS_PEDIDO.find((e) => e.valor === pedido.estado)
              return (
                <Link key={pedido.id} href={`/pedidos/${pedido.id}`}>
                  <Card
                    className={cn(
                      "card-glow cursor-pointer hover:shadow-md transition-all duration-300",
                      "animate-fade-up"
                    )}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 hidden sm:block">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary sm:hidden" />
                            <p className="font-semibold">{pedido.tiendaNombre}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatearFecha(pedido.fechaCreacion)}
                            {pedido.montoTotal && ` · ${formatearMoneda(pedido.montoTotal)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn(estadoInfo?.color, "border-0")}>
                          {estadoInfo?.etiqueta || pedido.estado}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}

        {!loading && filtrados.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No hay pedidos</p>
            <Link href="/pedidos/nuevo">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Crear primer pedido
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
