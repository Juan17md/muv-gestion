"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, productosService } from "@/lib/firebaseServices"
import { formatearFecha, ESTADOS_PEDIDO, cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import {
  Search,
  Package,
  CalendarIcon,
  X,
  ArrowUpDown,
} from "lucide-react"
import type { Pedido } from "@/lib/types"

const ABIERTOS = new Set(["comprado", "transito_china_usa", "casillero_usa", "transito_usa_ven", "entregado_ven"])

export default function HistorialPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined)
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined)
  const [ordenAsc, setOrdenAsc] = useState(false)
  const [productosCount, setProductosCount] = useState<Record<string, number>>({})

  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("fechaCreacion", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido))
      setPedidos(lista)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    const cargarConteos = async () => {
      const counts: Record<string, number> = {}
      for (const p of pedidos) {
        try {
          const prods = await productosService.listar(p.id)
          counts[p.id] = prods.length
        } catch {
          counts[p.id] = 0
        }
      }
      setProductosCount(counts)
    }
    if (!loading && pedidos.length > 0) {
      cargarConteos()
    }
  }, [loading, pedidos])

  const filtrados = useMemo(() => {
    let resultado = pedidos.filter((p) => {
      if (filtroEstado === "abierto" && !ABIERTOS.has(p.estado as string)) return false
      if (filtroEstado !== "todos" && filtroEstado !== "abierto" && p.estado !== filtroEstado) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!p.tiendaNombre.toLowerCase().includes(q) && !(p.numeroGuia || "").toLowerCase().includes(q)) return false
      }
      if (fechaDesde || fechaHasta) {
        const creado = p.fechaCreacion?.seconds ? new Date(p.fechaCreacion.seconds * 1000) : null
        if (creado) {
          if (fechaDesde && creado < fechaDesde) return false
          if (fechaHasta) {
            const hasta = new Date(fechaHasta)
            hasta.setHours(23, 59, 59, 999)
            if (creado > hasta) return false
          }
        }
      }
      return true
    })
    resultado.sort((a, b) => {
      const ta = a.fechaCreacion?.seconds || 0
      const tb = b.fechaCreacion?.seconds || 0
      return ordenAsc ? ta - tb : tb - ta
    })
    return resultado
  }, [pedidos, filtroEstado, busqueda, fechaDesde, fechaHasta, ordenAsc])

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div>
        <p className="typography-label text-primary">Gestión</p>
        <h1 className="typography-title-premium">Historial de Pedidos</h1>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tienda o guía..."
            className="pl-10"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { valor: "todos", etiqueta: "Todos" },
              { valor: "abierto", etiqueta: "Abierto" },
              ...ESTADOS_PEDIDO.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })),
            ].map((f) => (
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

        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {fechaDesde ? format(fechaDesde, "dd/MM/yyyy", { locale: es }) : "Desde"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaDesde}
                locale={es}
                onSelect={(d) => setFechaDesde(d || undefined)}
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">—</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {fechaHasta ? format(fechaHasta, "dd/MM/yyyy", { locale: es }) : "Hasta"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fechaHasta}
                locale={es}
                onSelect={(d) => setFechaHasta(d || undefined)}
              />
            </PopoverContent>
          </Popover>
          {(fechaDesde || fechaHasta) && (
            <Button variant="ghost" size="sm" onClick={() => { setFechaDesde(undefined); setFechaHasta(undefined) }}>
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOrdenAsc(!ordenAsc)}
            className="gap-1"
          >
            <ArrowUpDown className="h-4 w-4" />
            {ordenAsc ? "Más antiguos" : "Más recientes"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tienda</TableHead>
              <TableHead>Guía</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Compra</TableHead>
              <TableHead>Cerrado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-20">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No hay pedidos</p>
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
                      <TableCell className="text-muted-foreground text-xs max-w-[100px] truncate">
                        {pedido.numeroGuia || "-"}
                      </TableCell>
                      <TableCell>{productosCount[pedido.id] ?? <Skeleton className="h-5 w-8" />}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatearFecha(pedido.fechaCompra)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {pedido.estado === "cerrado" || pedido.estado === "entregado_cliente"
                          ? formatearFecha(pedido.fechaEntregadoCliente || pedido.fechaCierre)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(estadoInfo?.color, "border-0 text-[10px]")}>
                          {estadoInfo?.etiqueta || pedido.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/pedidos/${pedido.id}`)
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
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
