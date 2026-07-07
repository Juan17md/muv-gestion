"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { doc, onSnapshot, collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, productosService, ventasService, inventarioService } from "@/lib/firebaseServices"
import {
  formatearMoneda,
  formatearFecha,
  ESTADOS_PEDIDO,
  ESTADOS_PAGO,
  ESTATUS_ENTREGA,
  SIGUIENTE_ESTADO,
  cn,
} from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  Check,
  X,
  MessageCircle,
  Package,
  Wallet,
  User,
  PackagePlus,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import type { Pedido, ProductoPedido, ArticuloTienda, EstadoPedido } from "@/lib/types"

const ESTADOS_TIMELINE: EstadoPedido[] = [
  "borrador",
  "comprado",
  "transito_china_usa",
  "casillero_usa",
  "transito_usa_ven",
  "entregado_ven",
  "entregado_cliente",
]

export default function DetallePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [productos, setProductos] = useState<ProductoPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  const [nvoNombre, setNvoNombre] = useState("")
  const [nvoCantidad, setNvoCantidad] = useState("")
  const [nvoPrecio, setNvoPrecio] = useState("")
  const [nvoMargen, setNvoMargen] = useState("")
  const [nvoCliente, setNvoCliente] = useState("")
  const [nvoEnvio, setNvoEnvio] = useState("")
  const [nvoPrecioVenta, setNvoPrecioVenta] = useState("")
  const [nvoTipo, setNvoTipo] = useState<"cliente" | "inventario">("cliente")
  const [nvoEstadoPago, setNvoEstadoPago] = useState<string>("sin_pagar")
  const [nvoMontoPagado, setNvoMontoPagado] = useState("")
  const [creando, setCreando] = useState(false)
  const [retiroDialogoAbierto, setRetiroDialogoAbierto] = useState(false)
  const [whatsappMap, setWhatsappMap] = useState<Record<string, string>>({})
  const [productoEditando, setProductoEditando] = useState<string | null>(null)

  useEffect(() => {
    const unsubPedido = onSnapshot(doc(db, "pedidos", id), (snap) => {
      if (!snap.exists()) {
        router.push("/pedidos")
        return
      }
      setPedido({ id: snap.id, ...snap.data() } as Pedido)
      setLoading(false)
    })

    const unsubProds = onSnapshot(
      query(collection(db, "pedidos", id, "productos"), orderBy("creadoEn")),
      (snap) => {
        setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductoPedido)))
      }
    )

    return () => {
      unsubPedido()
      unsubProds()
    }
  }, [id, router])

  useEffect(() => {
    getDocs(query(collection(db, "clientes"), orderBy("nombre"))).then((snap) => {
      const mapa: Record<string, string> = {}
      snap.docs.forEach((d) => {
        mapa[d.id] = d.data().whatsapp || ""
      })
      setWhatsappMap(mapa)
    })
  }, [])

  const avanzarEstado = async () => {
    if (!pedido) return
    const sig = SIGUIENTE_ESTADO[pedido.estado]
    if (!sig) return

    if (sig === "entregado_cliente") {
      setRetiroDialogoAbierto(true)
      return
    }

    await pedidosService.avanzarEstado(pedido.id, sig)
    toast.success(`Pedido avanzó a ${ESTADOS_PEDIDO.find((e) => e.valor === sig)?.etiqueta}`)
  }

  const confirmarRetiro = async () => {
    if (!pedido) return
    setRetiroDialogoAbierto(false)

    const pendientes = productos.filter((p) => !p.retirado)
    if (pendientes.length === 0) {
      await pedidosService.avanzarEstado(pedido.id, "entregado_cliente")
      toast.success("Pedido retirado")
      return
    }

    try {
      for (const prod of pendientes) {
        if (prod.tipoProducto === "inventario" || (!prod.tipoProducto && !prod.clienteNombre)) {
          await inventarioService.crear({
            nombre: prod.nombre,
            cantidad: prod.cantidad,
            precioVenta: prod.precioVenta || prod.precioUnitario,
            costo: prod.precioUnitario,
            estado: "en_stock",
          })
        } else {
          const ventaData: Record<string, unknown> = {
            articuloNombre: prod.nombre,
            cantidad: prod.cantidad,
            precioVenta: prod.precioVenta || prod.precioUnitario * prod.cantidad,
            clienteNombre: prod.clienteNombre || "",
            estatusEntrega: "por_entregar",
            estatusPago: "por_pagar",
          }
          if (prod.clienteRef) ventaData.clienteId = prod.clienteRef
          await ventasService.crear(ventaData as Parameters<typeof ventasService.crear>[0])
        }

        if (prod.id) {
          await productosService.actualizar(pedido.id, prod.id, { retirado: true })
        }
      }

      await pedidosService.avanzarEstado(pedido.id, "entregado_cliente")
      toast.success(`${pendientes.length} producto${pendientes.length > 1 ? "s" : ""} retirado${pendientes.length > 1 ? "s" : ""}`)
    } catch {
      toast.error("Error al procesar retiro")
    }
  }

  const retrocederEstado = async () => {
    if (!pedido) return
    const idx = ESTADOS_TIMELINE.indexOf(pedido.estado)
    if (idx <= 0) return
    const anterior = ESTADOS_TIMELINE[idx - 1]
    await pedidosService.actualizar(pedido.id, { estado: anterior })
    toast.success("Estado retrocedido")
  }

  const agregarProducto = async () => {
    if (!nvoNombre) {
      toast.error("El nombre del producto es requerido")
      return
    }
    if (nvoTipo === "cliente" && !nvoCliente) {
      toast.error("El nombre del cliente es requerido")
      return
    }

    const cantidad = Number(nvoCantidad) || 0
    const precioUnitario = Number(nvoPrecio) || 0
    const envio = Number(nvoEnvio) || 0
    const margen = Number(nvoMargen) || 0
    const precioPorArticulo = cantidad > 0 ? (cantidad * precioUnitario + envio - margen) / cantidad : 0
    const precioVenta = nvoPrecioVenta ? Number(nvoPrecioVenta) : undefined

    if (nvoTipo === "cliente" && precioVenta !== undefined && precioVenta < precioPorArticulo) {
      toast.error("El precio de venta no puede ser menor al precio por artículo")
      setCreando(false)
      return
    }

    setCreando(true)
    try {
      const estadoPago = nvoTipo === "cliente" ? nvoEstadoPago : "sin_pagar"
      const data: Record<string, unknown> = {
        nombre: nvoNombre,
        cantidad,
        precioUnitario,
        tipoProducto: nvoTipo,
        estadoPago,
      }
      if (precioVenta !== undefined) data.precioVenta = precioVenta
      if (envio) data.envioCliente = envio
      if (nvoTipo === "cliente") data.margen = margen
      if (estadoPago === "parcial") {
        data.montoPagado = Number(nvoMontoPagado) || 0
      }
      if (nvoTipo === "cliente") {
        data.clienteNombre = nvoCliente
      } else {
        data.clienteNombre = ""
      }

      if (productoEditando) {
        await productosService.actualizar(id, productoEditando, data)
        toast.success("Producto actualizado")
      } else {
        await productosService.agregar(id, data as Parameters<typeof productosService.agregar>[1])
        toast.success("Producto agregado")
      }
      limpiarFormulario()
      setDialogoAbierto(false)
    } catch {
      toast.error("Error al guardar producto")
    } finally {
      setCreando(false)
    }
  }

  const eliminarProducto = async (productoId: string) => {
    await productosService.eliminar(id, productoId)
    toast.success("Producto eliminado")
  }

  const cambiarPago = async (productoId: string, estadoPago: string) => {
    await productosService.actualizar(id, productoId, {
      estadoPago: estadoPago as ProductoPedido["estadoPago"],
    })
  }

  const limpiarFormulario = () => {
    setNvoNombre("")
    setNvoCantidad("")
    setNvoPrecio("")
    setNvoMargen("")
    setNvoCliente("")
    setNvoEnvio("")
    setNvoPrecioVenta("")
    setNvoEstadoPago("sin_pagar")
    setNvoMontoPagado("")
    setProductoEditando(null)
  }

  const abrirEdicion = (prod: ProductoPedido) => {
    setNvoNombre(prod.nombre)
    setNvoCantidad(String(prod.cantidad))
    setNvoPrecio(String(prod.precioUnitario))
    setNvoMargen(prod.margen ? String(prod.margen) : "")
    setNvoCliente(prod.clienteNombre || "")
    setNvoEnvio(prod.envioCliente ? String(prod.envioCliente) : "")
    setNvoPrecioVenta(prod.precioVenta ? String(prod.precioVenta) : "")
    setNvoTipo(prod.tipoProducto === "inventario" || (!prod.tipoProducto && !prod.clienteNombre) ? "inventario" : "cliente")
    setNvoEstadoPago(prod.estadoPago || "sin_pagar")
    setNvoMontoPagado(prod.montoPagado ? String(prod.montoPagado) : "")
    setProductoEditando(prod.id || null)
    setDialogoAbierto(true)
  }

  if (loading || !pedido) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const estadoActual = ESTADOS_PEDIDO.find((e) => e.valor === pedido.estado)
  const idxActual = ESTADOS_TIMELINE.indexOf(pedido.estado)
  const esBorrador = pedido.estado === "borrador"
  const costoTotal = productos.reduce((s, p) => s + p.precioUnitario * p.cantidad, 0)
  const gananciaTotal = productos.reduce((s, p) => s + (p.margen || 0) * p.cantidad, 0)

  return (
    <div className="page-container max-w-4xl space-y-8 animate-fade-in">
      <div>
        <Link
          href="/pedidos"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver a pedidos
        </Link>
        <p className="typography-label text-primary">
          {pedido.tiendaNombre}
        </p>
        <h1 className="typography-title-premium">Detalle del Pedido</h1>
      </div>

      <Card className="card-glow">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Creado {formatearFecha(pedido.fechaCreacion)}
              </p>
              <div className="flex items-center gap-2">
                <Badge className={cn(estadoActual?.color, "border-0 text-xs")}>
                  {estadoActual?.etiqueta}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {idxActual > 0 && (
                <Button variant="outline" size="sm" onClick={retrocederEstado}>
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Retroceder
                </Button>
              )}
              {idxActual < ESTADOS_TIMELINE.length - 1 && (
                <Button size="sm" onClick={avanzarEstado}>
                  Avanzar
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-1.5 pb-2">
            {ESTADOS_TIMELINE.map((est, i) => {
              const info = ESTADOS_PEDIDO.find((e) => e.valor === est)
              const completado = i <= idxActual
              return (
                <div key={est} className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                  <div
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                      completado
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {completado ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
                    )}
                    {info?.etiqueta}
                  </div>
                  {i < ESTADOS_TIMELINE.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-3 shrink-0",
                        completado ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Productos</h2>
            </div>
            {esBorrador && (
              <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{productoEditando ? "Editar Producto" : "Agregar Producto"}</DialogTitle>
                    <DialogDescription className="sr-only">
                      {productoEditando ? "Edita el producto en el pedido" : "Agrega un producto al pedido"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
                    <div className="md:col-span-3 space-y-4">
                      <div className="space-y-3">
                        <Label>Nombre del producto</Label>
                        <Input
                          value={nvoNombre}
                          onChange={(e) => setNvoNombre(e.target.value)}
                          placeholder="Ej: Funda para celular"
                        />
                      </div>

                      <div className="flex rounded-lg border p-1 bg-muted">
                        <button
                          type="button"
                          onClick={() => setNvoTipo("cliente")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                            nvoTipo === "cliente" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <User className="h-3.5 w-3.5" />
                          Cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => setNvoTipo("inventario")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                            nvoTipo === "inventario" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <PackagePlus className="h-3.5 w-3.5" />
                          Mi stock
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="1"
                            value={nvoCantidad}
                            onChange={(e) => setNvoCantidad(e.target.value)}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Precio unitario (USD)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={nvoPrecio}
                            onChange={(e) => setNvoPrecio(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label>Descuento (USD)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={nvoMargen}
                            onChange={(e) => setNvoMargen(e.target.value)}
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>{nvoTipo === "inventario" ? "Otros (USD)" : "Precio de envío (USD)"}</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={nvoEnvio}
                            onChange={(e) => setNvoEnvio(e.target.value)}
                          />
                        </div>
                      </div>

                      {Number(nvoCantidad) > 0 && nvoTipo === "cliente" && (
                        <div className="space-y-3">
                          <Label>Precio de venta</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Precio de venta"
                            value={nvoPrecioVenta}
                            onChange={(e) => setNvoPrecioVenta(e.target.value)}
                          />
                        </div>
                      )}

                    </div>

                    <div className="md:col-span-2">
                      <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm space-y-2 sticky top-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumen</p>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatearMoneda((Number(nvoCantidad) || 0) * (Number(nvoPrecio) || 0))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Envío</span>
                          <span>+{formatearMoneda(Number(nvoEnvio) || 0)}</span>
                        </div>
                        {Number(nvoMargen) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Descuento</span>
                            <span className="text-green-600">-{formatearMoneda(Number(nvoMargen))}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium border-t pt-2 mt-2">
                          <span>Total</span>
                          <span>
                            {formatearMoneda(
                              (Number(nvoCantidad) || 0) * (Number(nvoPrecio) || 0) +
                              (Number(nvoEnvio) || 0) -
                              (Number(nvoMargen) || 0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-primary font-semibold pt-1">
                          <span>Precio por artículo</span>
                          <span>
                            {formatearMoneda(
                              Number(nvoCantidad) > 0
                                ? ((Number(nvoCantidad) || 0) * (Number(nvoPrecio) || 0) +
                                    (Number(nvoEnvio) || 0) -
                                    (Number(nvoMargen) || 0)) / Number(nvoCantidad)
                                : 0
                            )}
                          </span>
                        </div>
                      </div>

                      {nvoTipo === "cliente" && (
                        <div className="space-y-4">
                          <Separator />
                          <div className="space-y-3">
                            <Label>Cliente</Label>
                            <Input
                              value={nvoCliente}
                              onChange={(e) => setNvoCliente(e.target.value)}
                              placeholder="Nombre del cliente"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Estado del pago</Label>
                            <div className="flex gap-1.5">
                              {ESTADOS_PAGO.map((ep) => (
                                <button
                                  key={ep.valor}
                                  type="button"
                                  onClick={() => {
                                    setNvoEstadoPago(ep.valor)
                                    if (ep.valor !== "parcial") setNvoMontoPagado("")
                                  }}
                                  className={cn(
                                    "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                    nvoEstadoPago === ep.valor
                                      ? ep.color + " border-transparent"
                                      : "bg-muted text-muted-foreground border-transparent hover:border-border"
                                  )}
                                >
                                  {ep.etiqueta}
                                </button>
                              ))}
                            </div>
                          </div>
                          {nvoEstadoPago === "parcial" && (
                            <div className="space-y-3">
                              <Label>Monto pagado (USD)</Label>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={nvoMontoPagado}
                                onChange={(e) => setNvoMontoPagado(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={agregarProducto}
                    className="w-full"
                    disabled={creando}
                  >
                    {creando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : productoEditando ? (
                      "Guardar cambios"
                    ) : (
                      "Agregar al pedido"
                    )}
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {productos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No hay productos</p>
              {esBorrador && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setDialogoAbierto(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar primer producto
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Costo/U</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Dscto</TableHead>
                    <TableHead className="text-right">Envío</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productos.map((prod) => {
                    const totalProd = prod.precioUnitario * prod.cantidad
                    const esInventario = prod.tipoProducto === "inventario" || (!prod.tipoProducto && !prod.clienteNombre)
                    const whatsapp = prod.clienteRef ? whatsappMap[prod.clienteRef] : ""

                    return (
                      <TableRow key={prod.id} className={cn(prod.retirado && "opacity-50")}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{prod.nombre}</span>
                            {prod.retirado && (
                              <Badge variant="outline" className="text-[10px] h-5">Retirado</Badge>
                            )}
                            {esInventario && !prod.retirado && (
                              <Badge variant="outline" className="text-[10px] h-5 text-blue-600 border-blue-200 bg-blue-50">Stock</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {prod.clienteNombre && !esInventario ? prod.clienteNombre : "-"}
                        </TableCell>
                        <TableCell className="text-right">{prod.cantidad}</TableCell>
                        <TableCell className="text-right font-medium text-muted-foreground">
                          {formatearMoneda(prod.precioUnitario)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatearMoneda(totalProd)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {prod.margen != null
                            ? formatearMoneda(prod.margen)
                            : !esInventario
                              ? formatearMoneda(0)
                              : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {prod.envioCliente ? formatearMoneda(prod.envioCliente) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatearMoneda(totalProd + (prod.envioCliente || 0) - (prod.margen || 0))}
                        </TableCell>
                        <TableCell>
                          {!prod.retirado && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={cn(
                                    "px-2 py-1 rounded text-[10px] font-medium transition-all",
                                    ESTADOS_PAGO.find((ep) => ep.valor === prod.estadoPago)?.color ||
                                      "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {ESTADOS_PAGO.find((ep) => ep.valor === prod.estadoPago)?.etiqueta || "Sin Pagar"}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="min-w-[120px]">
                                {ESTADOS_PAGO.map((ep) => (
                                  <DropdownMenuItem
                                    key={ep.valor}
                                    onClick={() => prod.id && cambiarPago(prod.id, ep.valor)}
                                    className={cn(
                                      "text-xs",
                                      prod.estadoPago === ep.valor && "font-semibold"
                                    )}
                                  >
                                    {ep.etiqueta}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                        <TableCell>
                          {!prod.retirado && (
                            <div className="flex items-center gap-1">
                              {whatsapp && (
                                <Button variant="ghost" size="icon-sm" asChild>
                                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {esBorrador && prod.id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => abrirEdicion(prod)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => eliminarProducto(prod.id!)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Resumen Financiero</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Costo Total</p>
              <p className="text-lg font-bold">{formatearMoneda(costoTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ganancia Total</p>
              <p className="text-lg font-bold text-emerald-600">
                {formatearMoneda(gananciaTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendiente de Pago</p>
              <p className="text-lg font-bold text-yellow-600">
                {formatearMoneda(
                  productos
                    .filter((p) => p.estadoPago !== "pagado")
                    .reduce(
                      (s, p) =>
                        s +
                        p.precioUnitario * p.cantidad +
                        (p.margen || 0) -
                        (p.montoPagado || 0),
                      0
                    )
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Productos</p>
              <p className="text-lg font-bold">{productos.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={retiroDialogoAbierto} onOpenChange={setRetiroDialogoAbierto}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar retiro</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const porCliente = productos.filter((p) => !p.retirado && (p.tipoProducto === "cliente" || (!p.tipoProducto && p.clienteNombre)))
                const porStock = productos.filter((p) => !p.retirado && (p.tipoProducto === "inventario" || (!p.tipoProducto && !p.clienteNombre)))
                return (
                  <div className="space-y-2">
                    {porCliente.length > 0 && (
                      <p>• {porCliente.length} producto{porCliente.length > 1 ? "s" : ""} → <strong>Ventas</strong> (por entregar)</p>
                    )}
                    {porStock.length > 0 && (
                      <p>• {porStock.length} producto{porStock.length > 1 ? "s" : ""} → <strong>Inventario</strong></p>
                    )}
                    {porCliente.length === 0 && porStock.length === 0 && (
                      <p>No hay productos pendientes por retirar.</p>
                    )}
                  </div>
                )
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRetiroDialogoAbierto(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarRetiro}>
              Confirmar retiro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
