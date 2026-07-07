"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import {
  Plus,
  Store,
  Search,
  Pencil,
  Trash2,
  Loader2,
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
  const [formCantidad, setFormCantidad] = useState("")
  const [formPrecioCompra, setFormPrecioCompra] = useState("")
  const [formPrecioVenta, setFormPrecioVenta] = useState("")
  const [formTiendaCompra, setFormTiendaCompra] = useState("")
  const [formCodigo, setFormCodigo] = useState("")
  const [formProveedor, setFormProveedor] = useState("")
  const [formNotas, setFormNotas] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

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
      setFormCantidad(String(articulo.cantidad))
      setFormPrecioCompra(String(articulo.costo))
      setFormPrecioVenta(String(articulo.precioVenta))
      setFormTiendaCompra(articulo.tiendaCompra || "")
      setFormCodigo(articulo.codigo || "")
      setFormProveedor(articulo.proveedor || "")
      setFormNotas(articulo.notas || "")
    } else {
      setEditandoId(null)
      setFormNombre("")
      setFormCantidad("")
      setFormPrecioCompra("")
      setFormPrecioVenta("")
      setFormTiendaCompra("")
      setFormCodigo("")
      setFormProveedor("")
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
        cantidad: Number(formCantidad) || 0,
        costo: Number(formPrecioCompra) || 0,
        precioVenta: Number(formPrecioVenta) || 0,
        tiendaCompra: formTiendaCompra || undefined,
        codigo: formCodigo || undefined,
        proveedor: formProveedor || undefined,
        estado: "en_stock" as ArticuloTienda["estado"],
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
    setEliminandoId(id)
  }

  const confirmarEliminar = async () => {
    if (!eliminandoId) return
    await inventarioService.eliminar(eliminandoId)
    toast.success("Artículo eliminado")
    setEliminandoId(null)
  }

  const filtrados = articulos.filter((a) => {
    if (filtroEstado !== "todos" && a.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo?.toLowerCase().includes(q) ?? false) ||
        (a.tiendaCompra?.toLowerCase().includes(q) ?? false) ||
        (a.proveedor?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  return (
    <div className="page-container space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/tienda" className="typography-label text-primary hover:underline">Mi tienda</Link>
          <h1 className="typography-title-premium">Inventario</h1>
        </div>
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editandoId ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
              <DialogDescription className="sr-only">
                {editandoId ? "Edita los datos del artículo" : "Completa los datos del nuevo artículo"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-3 col-span-2">
                  <Label>Nombre del artículo</Label>
                  <Input value={formNombre} onChange={(e) => setFormNombre(e.target.value)} placeholder="Ej: Funda iPhone 15" />
                </div>
                <div className="space-y-3">
                  <Label>Cantidad</Label>
                  <Input type="number" min={0} value={formCantidad} onChange={(e) => setFormCantidad(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Precio compra (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={formPrecioCompra} onChange={(e) => setFormPrecioCompra(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Precio venta (USD)</Label>
                  <Input type="number" min={0} step={0.01} value={formPrecioVenta} onChange={(e) => setFormPrecioVenta(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Tienda de compra</Label>
                  <Input value={formTiendaCompra} onChange={(e) => setFormTiendaCompra(e.target.value)} placeholder="Ej: AliExpress, Shopee..." />
                </div>
                <div className="space-y-3">
                  <Label>Código</Label>
                  <Input value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} placeholder="ID producto" />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Proveedor</Label>
                <Input value={formProveedor} onChange={(e) => setFormProveedor(e.target.value)} placeholder="Nombre del vendedor o proveedor" />
              </div>
              <div className="space-y-3">
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, código, tienda o proveedor..." className="pl-10" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
                            {articulo.codigo && <span className="text-xs text-muted-foreground">· {articulo.codigo}</span>}
                            <Badge className={cn(estadoInfo?.color, "border-0 text-[10px]")}>{estadoInfo?.etiqueta}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Stock: <strong>{articulo.cantidad}</strong></span>
                            <span>Venta: <strong>{formatearMoneda(articulo.precioVenta)}</strong></span>
                            <span>Compra: <strong>{formatearMoneda(articulo.costo)}</strong></span>
                          </div>
                          {(articulo.tiendaCompra || articulo.proveedor) && (
                            <p className="text-xs text-muted-foreground">
                              {articulo.tiendaCompra && <span>Tienda: <span className="font-medium text-foreground">{articulo.tiendaCompra}</span></span>}
                              {articulo.tiendaCompra && articulo.proveedor && <span> · </span>}
                              {articulo.proveedor && <span>Proveedor: <span className="font-medium text-foreground">{articulo.proveedor}</span></span>}
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
      <AlertDialog open={!!eliminandoId} onOpenChange={(open) => !open && setEliminandoId(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artículo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás segura de eliminar este artículo del inventario? Esta acción no se puede deshacer.
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
