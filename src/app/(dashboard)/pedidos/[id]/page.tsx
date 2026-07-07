"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, productosService } from "@/lib/firebaseServices"
import {
  formatearMoneda,
  formatearFecha,
  ESTADOS_PEDIDO,
  ESTADOS_PAGO,
  SIGUIENTE_ESTADO,
  cn,
} from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
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
} from "lucide-react"
import Link from "next/link"
import type { Pedido, ProductoPedido } from "@/lib/types"

const ESTADOS_TIMELINE = [
  "borrador",
  "comprado",
  "transito_china_usa",
  "casillero_usa",
  "transito_usa_ven",
  "entregado_ven",
  "entregado_cliente",
  "cerrado",
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
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    const unsubPedido = onSnapshot(doc(db, "pedidos", id), (snap) => {
      if (!snap.exists()) {
        router.push("/pedidos")
        return
      }
      setPedido({ id: snap.id, ...snap.data() } as Pedido)
      setLoading(false)
    })

    const unsubProds = productosService.listar(id).then(setProductos)

    return () => {
      unsubPedido()
    }
  }, [id, router])

  const avanzarEstado = async () => {
    if (!pedido) return
    const sig = SIGUIENTE_ESTADO[pedido.estado]
    if (!sig) return
    await pedidosService.avanzarEstado(pedido.id, sig)
    toast.success(`Pedido avanzó a ${ESTADOS_PEDIDO.find((e) => e.valor === sig)?.etiqueta}`)
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
    if (!nvoNombre || !nvoCliente) {
      toast.error("Nombre del producto y cliente son requeridos")
      return
    }
    setCreando(true)
    try {
      await productosService.agregar(id, {
        nombre: nvoNombre,
        cantidad: Number(nvoCantidad) || 0,
        precioUnitario: Number(nvoPrecio) || 0,
        margen: Number(nvoMargen) || 0,
        envioCliente: Number(nvoEnvio) || undefined,
        clienteNombre: nvoCliente,
        estadoPago: "sin_pagar",
      })
      setNvoNombre("")
      setNvoCantidad("")
      setNvoPrecio("")
      setNvoMargen("")
      setNvoCliente("")
      setNvoEnvio("")
      setDialogoAbierto(false)
      toast.success("Producto agregado")
    } catch {
      toast.error("Error al agregar producto")
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

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {ESTADOS_TIMELINE.map((est, i) => {
              const info = ESTADOS_PEDIDO.find((e) => e.valor === est)
              const completado = i <= idxActual
              return (
                <div key={est} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                      completado
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {completado ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    )}
                    {info?.etiqueta}
                  </div>
                  {i < ESTADOS_TIMELINE.length - 1 && (
                    <div
                      className={cn(
                        "h-px w-4",
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
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Producto</DialogTitle>
                    <DialogDescription className="sr-only">
                      Agrega un producto al pedido
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-3">
                      <Label>Nombre del producto</Label>
                      <Input
                        value={nvoNombre}
                        onChange={(e) => setNvoNombre(e.target.value)}
                        placeholder="Ej: Funda para celular"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min={1}
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
                          value={nvoPrecio}
                          onChange={(e) => setNvoPrecio(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label>Margen (USD)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={nvoMargen}
                          onChange={(e) => setNvoMargen(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Envío cliente (USD)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={nvoEnvio}
                          onChange={(e) => setNvoEnvio(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Cliente</Label>
                      <Input
                        value={nvoCliente}
                        onChange={(e) => setNvoCliente(e.target.value)}
                        placeholder="Nombre del cliente"
                      />
                    </div>
                    <Button
                      onClick={agregarProducto}
                      className="w-full"
                      disabled={creando}
                    >
                      {creando ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Agregar al pedido"
                      )}
                    </Button>
                  </div>
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
            <div className="grid gap-3">
              {productos.map((prod) => {
                const pagoInfo = ESTADOS_PAGO.find((e) => e.valor === prod.estadoPago)
                const totalProd = prod.precioUnitario * prod.cantidad
                const precioCliente = totalProd + (prod.margen || 0) + (prod.envioCliente || 0)

                return (
                  <div
                    key={prod.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-background/50"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{prod.nombre}</p>
                        <span className="text-xs text-muted-foreground">
                          x{prod.cantidad}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {prod.clienteNombre}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Costo: {formatearMoneda(totalProd)}</span>
                        <span>Margen: {formatearMoneda(prod.margen || 0)}</span>
                        <span>Cliente: {formatearMoneda(precioCliente)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {prod.clienteRef || prod.clienteNombre ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                        >
                          <a
                            href={`https://wa.me/`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}

                      <div className="flex gap-1">
                        {ESTADOS_PAGO.map((ep) => (
                          <button
                            key={ep.valor}
                            onClick={() => prod.id && cambiarPago(prod.id, ep.valor)}
                            className={cn(
                              "px-2 py-1 rounded text-[10px] font-medium transition-all",
                              prod.estadoPago === ep.valor
                                ? ep.color
                                : "bg-muted text-muted-foreground/50"
                            )}
                          >
                            {ep.etiqueta}
                          </button>
                        ))}
                      </div>

                      {esBorrador && prod.id && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => eliminarProducto(prod.id!)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
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
    </div>
  )
}
