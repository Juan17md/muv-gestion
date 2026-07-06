"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { inventarioService } from "@/lib/firebaseServices"
import { formatearMoneda, formatearFecha, ESTADOS_ARTICULO, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus,
  Store,
  Search,
  Pencil,
  Trash2,
  Package,
  Loader2,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react"
import type { ArticuloTienda } from "@/lib/types"

const FILTROS_ESTADO = [
  { valor: "todos", etiqueta: "Todos" },
  ...ESTADOS_ARTICULO.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta })),
]

export default function InventarioPage() {
  const [articulos, setArticulos] = useState<ArticuloTienda[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [formNombre, setFormNombre] = useState("")
  const [formCantidad, setFormCantidad] = useState(1)
  const [formPrecioVenta, setFormPrecioVenta] = useState(0)
  const [formCosto, setFormCosto] = useState(0)
  const [formCategoria, setFormCategoria] = useState("")
  const [formEstado, setFormEstado] = useState<string>("en_stock")
  const [formCliente, setFormCliente] = useState("")
  const [formNotas, setFormNotas] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const q = query(collection(db, "inventario"), orderBy("creadoEn", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setArticulos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticuloTienda)))
      setLoading(false)
    })
    return unsub
  }, [])

  const abrirDialogo = (articulo?: ArticuloTienda) => {
    if (articulo) {
      setEditandoId(articulo.id)
      setFormNombre(articulo.nombre)
      setFormCantidad(articulo.cantidad)
      setFormPrecioVenta(articulo.precioVenta)
      setFormCosto(articulo.costo)
      setFormCategoria(articulo.categoria || "")
      setFormEstado(articulo.estado)
      setFormCliente(articulo.clienteNombre || "")
      setFormNotas(articulo.notas || "")
    } else {
      setEditandoId(null)
      setFormNombre("")
      setFormCantidad(1)
      setFormPrecioVenta(0)
      setFormCosto(0)
      setFormCategoria("")
      setFormEstado("en_stock")
      setFormCliente("")
      setFormNotas("")
    }
    setDialogoAbierto(true)
  }

  const guardar = async () => {
    if (!formNombre) {
      toast.error("El nombre es requerido")
      return
    }
    setGuardando(true)
    try {
      const data = {
        nombre: formNombre,
        cantidad: formCantidad,
        precioVenta: formPrecioVenta,
        costo: formCosto,
        categoria: formCategoria || undefined,
        estado: formEstado as ArticuloTienda["estado"],
        clienteNombre: formCliente || undefined,
        notas: formNotas || undefined,
      }

      if (editandoId) {
        await inventarioService.actualizar(editandoId, data)
        toast.success("Artículo actualizado")
      } else {
        await inventarioService.crear(data)
        toast.success("Artículo agregado al inventario")
      }
      setDialogoAbierto(false)
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este artículo?")) return
    await inventarioService.eliminar(id)
    toast.success("Artículo eliminado")
  }

  const filtrados = articulos.filter((a) => {
    if (filtroEstado !== "todos" && a.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.clienteNombre?.toLowerCase().includes(q) ?? false) ||
        (a.categoria?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const totalInvertido = articulos.reduce((s, a) => s + a.costo * a.cantidad, 0)
  const totalVenta = articulos.reduce((s, a) => s + a.precioVenta * a.cantidad, 0)
  const totalStock = articulos.reduce((s, a) => s + a.cantidad, 0)
  const totalVendidos = articulos.filter((a) => a.estado === "vendido").length

  const metricas = [
    { icon: Package, label: "En Stock", valor: articulos.filter((a) => a.estado === "en_stock").length.toString(), color: "text-emerald-600" },
    { icon: TrendingUp, label: "Vendidos", valor: totalVendidos.toString(), color: "text-blue-600" },
    { icon: DollarSign, label: "Invertido", valor: formatearMoneda(totalInvertido), color: "text-yellow-600" },
    { icon: BarChart3, label: "Valor Total", valor: formatearMoneda(totalVenta), color: "text-primary" },
  ]

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="typography-label text-primary">Mi tienda</p>
          <h1 className="typography-title-premium">Inventario</h1>
        </div>
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editandoId ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del artículo</Label>
                <Input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej: Funda iPhone 15" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input type="number" min={0} value={formCantidad} onChange={(e) => setFormCantidad(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Precio (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={formPrecioVenta} onChange={(e) => setFormPrecioVenta(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Costo (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={formCosto} onChange={(e) => setFormCosto(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} placeholder="Ej: Accesorios, Ropa, Electrónica..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={formEstado} onValueChange={setFormEstado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_ARTICULO.map((e) => (
                        <SelectItem key={e.valor} value={e.valor}>{e.etiqueta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={formCliente} onChange={(e) => setFormCliente(e.target.value)} placeholder="Quién lo compró" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={formNotas} onChange={(e) => setFormNotas(e.target.value)} placeholder="Detalles adicionales..." />
              </div>
              <Button onClick={guardar} className="w-full" disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : editandoId ? "Actualizar" : "Agregar al inventario"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map(({ icon: Icon, label, valor, color }) => (
          <Card key={label} className="card-glow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{valor}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, cliente o categoría..." className="pl-10" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              onClick={() => setFiltroEstado(f.valor)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                filtroEstado === f.valor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="card-glow">
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))
          : filtrados.map((articulo, idx) => {
              const estadoInfo = ESTADOS_ARTICULO.find((e) => e.valor === articulo.estado)
              return (
                <Card
                  key={articulo.id}
                  className={cn("card-glow animate-fade-up")}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2.5 rounded-xl bg-primary/10 hidden sm:block">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{articulo.nombre}</p>
                            <Badge className={cn(estadoInfo?.color, "border-0 text-[10px]")}>{estadoInfo?.etiqueta}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Stock: <strong>{articulo.cantidad}</strong></span>
                            <span>Precio: <strong>{formatearMoneda(articulo.precioVenta)}</strong></span>
                            <span>Costo: <strong>{formatearMoneda(articulo.costo)}</strong></span>
                            {articulo.categoria && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{articulo.categoria}</span>}
                          </div>
                          {articulo.clienteNombre && (
                            <p className="text-xs text-muted-foreground">
                              Cliente: <span className="font-medium text-foreground">{articulo.clienteNombre}</span>
                              {articulo.fechaVenta && ` · ${formatearFecha(articulo.fechaVenta)}`}
                            </p>
                          )}
                          {articulo.notas && (
                            <p className="text-xs text-muted-foreground italic">{articulo.notas}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button variant="ghost" size="icon-sm" onClick={() => abrirDialogo(articulo)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => eliminar(articulo.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

        {!loading && filtrados.length === 0 && (
          <div className="text-center py-16">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {busqueda || filtroEstado !== "todos" ? "Sin resultados" : "Tu tienda está vacía"}
            </p>
            {!busqueda && filtroEstado === "todos" && (
              <Button variant="outline" className="mt-4 gap-2" onClick={() => abrirDialogo()}>
                <Plus className="h-4 w-4" />
                Agregar primer artículo
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
