"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService } from "@/lib/firebaseServices"
import { formatearMoneda, formatearFecha, ESTADOS_PEDIDO, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Search, Package, Pencil, Trash2 } from "lucide-react"
import type { Pedido, EstadoPedido } from "@/lib/types"

const FILTROS_ESTADO = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "borrador", etiqueta: "Borrador" },
  { valor: "abierto", etiqueta: "Abierto" },

]

const ESTADOS_ABIERTO: EstadoPedido[] = ["comprado", "transito_china_usa", "casillero_usa", "transito_usa_ven", "entregado_ven"]

export default function PedidosPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

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

  const confirmarEliminar = async () => {
    if (!eliminandoId) return
    await pedidosService.eliminar(eliminandoId)
    toast.success("Pedido eliminado")
    setEliminandoId(null)
  }

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
              <TableHead className="w-24">Acciones</TableHead>
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
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/pedidos/${pedido.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setEliminandoId(pedido.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!eliminandoId} onOpenChange={(open) => !open && setEliminandoId(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pedido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás segura de eliminar este pedido? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEliminandoId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmarEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
