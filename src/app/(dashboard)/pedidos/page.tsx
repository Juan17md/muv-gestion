"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatearMoneda, formatearFecha, ESTADOS_PEDIDO, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, Package, ArrowRight } from "lucide-react"
import type { Pedido } from "@/lib/types"

const FILTROS_ESTADO = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "borrador", etiqueta: "Borrador" },
  { valor: "abierto", etiqueta: "Abierto" },
  { valor: "cerrado", etiqueta: "Cerrado" },
]

const ESTADOS_ABIERTO = ["comprado", "transito_china_usa", "casillero_usa", "transito_usa_ven", "entregado_ven", "entregado_cliente"]

export default function PedidosPage() {
  const router = useRouter()
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
    if (filtroEstado === "abierto" && !ESTADOS_ABIERTO.includes(p.estado)) return false
    if (filtroEstado !== "todos" && filtroEstado !== "abierto" && p.estado !== filtroEstado) return false
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

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tienda</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground mb-3">No hay pedidos</p>
                      <Link href="/pedidos/nuevo">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-3 w-3" />
                          Crear primer pedido
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              : filtrados.map((pedido) => {
                  const estadoInfo = ESTADOS_PEDIDO.find((e) => e.valor === pedido.estado)
                  return (
                    <TableRow
                      key={pedido.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/pedidos/${pedido.id}`)}
                    >
                      <TableCell className="font-medium">{pedido.tiendaNombre}</TableCell>
                      <TableCell className="text-muted-foreground">{formatearFecha(pedido.fechaCreacion)}</TableCell>
                      <TableCell>{pedido.montoTotal ? formatearMoneda(pedido.montoTotal) : "-"}</TableCell>
                      <TableCell>
                        <Badge className={cn(estadoInfo?.color, "border-0")}>
                          {estadoInfo?.etiqueta || pedido.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
