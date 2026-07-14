"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot, getDocs, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ventasService } from "@/lib/firebaseServices"
import { formatearMoneda, formatearFecha, METODOS_PAGO, ESTATUS_PAGO_VENTA, ESTATUS_ENTREGA, cn } from "@/lib/utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Search, Receipt, ArrowLeftRight, MessageCircle, Calendar as CalendarIcon } from "lucide-react"
import type { Venta } from "@/lib/types"
import { toast } from "sonner"

const FILTROS_ESTATUS = [
  { valor: "todos", etiqueta: "Todos" },
  ...ESTATUS_PAGO_VENTA.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })),
]

export default function TiendaHistorialPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstatus, setFiltroEstatus] = useState("por_pagar")
  const [whatsappMap, setWhatsappMap] = useState<Record<string, string>>({})
  const [cobroDialogoAbierto, setCobroDialogoAbierto] = useState(false)
  const [ventaCobrando, setVentaCobrando] = useState<Venta | null>(null)
  const [cobroMetodo, setCobroMetodo] = useState("")
  const [cobroFecha, setCobroFecha] = useState<Date>(new Date())
  const [cobroPopoverCalendario, setCobroPopoverCalendario] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "ventas"), orderBy("creadoEn", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setVentas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta)))
      setLoading(false)
    })

    getDocs(query(collection(db, "clientes"))).then((snap) => {
      const mapa: Record<string, string> = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        mapa[d.id] = data.whatsapp || ""
      })
      setWhatsappMap(mapa)
    })

    return unsub
  }, [])

  const filtrados = ventas.filter((v) => {
    if (filtroEstatus !== "todos" && v.estatusPago !== filtroEstatus) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        v.articuloNombre.toLowerCase().includes(q) ||
        v.clienteNombre.toLowerCase().includes(q)
      )
    }
    return true
  })

  async function toggleEstatus(venta: Venta) {
    if (venta.estatusPago === "por_pagar") {
      setVentaCobrando(venta)
      setCobroMetodo(venta.metodoPago || "")
      setCobroFecha(venta.fechaPago ? new Date(venta.fechaPago.seconds * 1000) : new Date())
      setCobroDialogoAbierto(true)
      return
    }
    await updateDoc(doc(db, "ventas", venta.id), {
      estatusPago: "por_pagar",
      actualizadoEn: serverTimestamp(),
    })
  }

  async function confirmarCobro() {
    if (!ventaCobrando) return
    if (!cobroMetodo) {
      toast.error("Selecciona un método de pago")
      return
    }
    await updateDoc(doc(db, "ventas", ventaCobrando.id), {
      estatusPago: "pagado",
      metodoPago: cobroMetodo,
      fechaPago: Timestamp.fromDate(cobroFecha),
      actualizadoEn: serverTimestamp(),
    })
    setCobroDialogoAbierto(false)
    setVentaCobrando(null)
  }

  async function toggleEntrega(venta: Venta) {
    const nuevo = venta.estatusEntrega === "entregado" ? "por_entregar" : "entregado"
    await updateDoc(doc(db, "ventas", venta.id), {
      estatusEntrega: nuevo,
      actualizadoEn: serverTimestamp(),
    })
  }

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div>
        <p className="typography-label text-primary">Tienda / Cobros</p>
        <h1 className="typography-title-premium">Cobros Pendientes</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por artículo o cliente..."
            className="pl-10"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={filtroEstatus} onValueChange={setFiltroEstatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTROS_ESTATUS.map((f) => (
                <SelectItem key={f.valor} value={f.valor}>{f.etiqueta}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artículo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Cant.</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método de pago</TableHead>
              <TableHead>Fecha de pago</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Entrega</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <Receipt className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        {busqueda || filtroEstatus !== "todos" ? "Sin resultados" : "No hay ventas registradas"}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              : filtrados.map((venta) => {
                  const metodoInfo = METODOS_PAGO.find((m) => m.valor === venta.metodoPago)
                  const estatusInfo = ESTATUS_PAGO_VENTA.find((e) => e.valor === venta.estatusPago)
                  const entregaInfo = ESTATUS_ENTREGA.find((e) => e.valor === venta.estatusEntrega)
                  return (
                    <TableRow key={venta.id}>
                      <TableCell className="font-medium">{venta.articuloNombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{venta.clienteNombre}</span>
                          {(venta.clienteWhatsapp || (venta.clienteId && whatsappMap[venta.clienteId])) && (
                            <button
                              onClick={() => window.open(`https://wa.me/${venta.clienteWhatsapp || whatsappMap[venta.clienteId!]}`, "_blank")}
                              className="text-primary hover:text-primary/80 transition-colors"
                              title="Contactar por WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{venta.cantidad}</TableCell>
                      <TableCell className="text-emerald-600 font-medium">
                        {formatearMoneda(venta.precioVenta * venta.cantidad)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{metodoInfo?.etiqueta || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{venta.fechaPago ? formatearFecha(venta.fechaPago) : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            "border-0",
                            venta.estatusPago === "pagado" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {estatusInfo?.etiqueta || "Por pagar"}
                          </Badge>
                          <button
                            onClick={() => toggleEstatus(venta)}
                            className="size-7 rounded-full border border-muted-foreground/30 flex items-center justify-center hover:bg-muted transition-colors"
                            title="Cambiar estado de pago"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            "border-0 cursor-pointer transition-opacity hover:opacity-80",
                            venta.estatusEntrega === "entregado" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {entregaInfo?.etiqueta || "Por entregar"}
                          </Badge>
                          <button
                            onClick={() => toggleEntrega(venta)}
                            className="size-7 rounded-full border border-muted-foreground/30 flex items-center justify-center hover:bg-muted transition-colors"
                            title="Cambiar estado de entrega"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={cobroDialogoAbierto} onOpenChange={setCobroDialogoAbierto}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
            <DialogDescription>
              Completa los datos del pago para marcar la venta como pagada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={cobroMetodo} onValueChange={setCobroMetodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método..." />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>{m.etiqueta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de pago</Label>
              <Popover open={cobroPopoverCalendario} onOpenChange={setCobroPopoverCalendario}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-[50px] gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{format(cobroFecha, "PPP", { locale: es })}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={es}
                    selected={cobroFecha}
                    onSelect={(d) => { if (d) { setCobroFecha(d); setCobroPopoverCalendario(false) } }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCobroDialogoAbierto(false)}>Cancelar</Button>
            <Button onClick={confirmarCobro}>Confirmar pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
