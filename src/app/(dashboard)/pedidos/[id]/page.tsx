"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter } from "next/navigation"
import { doc, onSnapshot, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { pedidosService, productosService, ventasService, inventarioService, clientesService } from "@/lib/firebaseServices"
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
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
  CalendarIcon,
} from "lucide-react"
import Link from "next/link"
import type { Pedido, ProductoPedido, ArticuloTienda, EstadoPedido, Cliente } from "@/lib/types"

interface ProductoCarrito {
  nombre: string
  cantidad: number
  precioUnitario: number
  precioVenta?: number
  descuento: number
  envioCliente: number
  tipoProducto: "cliente" | "inventario"
  clienteNombre: string
  clienteWhatsapp?: string
  estadoPago: string
  montoPagado?: number
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const date = value ? new Date(value + "T12:00:00") : undefined
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : <span className="text-muted-foreground">Seleccionar fecha</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          locale={es}
          onSelect={(d) => onChange(d ? d.toISOString().split("T")[0] : "")}
        />
      </PopoverContent>
    </Popover>
  )
}

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
  const [nvoDescuento, setNvoDescuento] = useState("")
  const [nvoCliente, setNvoCliente] = useState("")
  const [nvoTelefonoCliente, setNvoTelefonoCliente] = useState("")
  const [nvoEnvio, setNvoEnvio] = useState("")
  const [nvoPrecioVenta, setNvoPrecioVenta] = useState("")
  const [nvoTipo, setNvoTipo] = useState<"cliente" | "inventario">("cliente")
  const [nvoEstadoPago, setNvoEstadoPago] = useState<string>("sin_pagar")
  const [nvoMontoPagado, setNvoMontoPagado] = useState("")
  const [creando, setCreando] = useState(false)
  const [carritoProductos, setCarritoProductos] = useState<ProductoCarrito[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false)
  const clienteInputRef = useRef<HTMLDivElement>(null)
  const [retiroDialogoAbierto, setRetiroDialogoAbierto] = useState(false)
  const [whatsappMap, setWhatsappMap] = useState<Record<string, string>>({})
  const [productoEditando, setProductoEditando] = useState<string | null>(null)
  const [compraDialogoAbierto, setCompraDialogoAbierto] = useState(false)
  const [nvoNumeroGuia, setNvoNumeroGuia] = useState("")
  const [nvoServicioMensajeria, setNvoServicioMensajeria] = useState("")
  const [nvoCostoEnvio, setNvoCostoEnvio] = useState("")
  const [nvoImpuestoCompra, setNvoImpuestoCompra] = useState("")
  const [nvoDescuentoPedido, setNvoDescuentoPedido] = useState("")
  const [envioVnzlDialogoAbierto, setEnvioVnzlDialogoAbierto] = useState(false)
  const [nvoCostoEnvioVnzl, setNvoCostoEnvioVnzl] = useState("")
  const [nvoNumeroGuiaVnzl, setNvoNumeroGuiaVnzl] = useState("")
  const [nvoPeso, setNvoPeso] = useState("")
  const [nvoVolumen, setNvoVolumen] = useState("")
  const [nvoMedidaCaja, setNvoMedidaCaja] = useState("")
  const [fechaDialogoAbierto, setFechaDialogoAbierto] = useState(false)
  const [fechaDialogoObjetivo, setFechaDialogoObjetivo] = useState<EstadoPedido | "">("")
  const [nvoFecha, setNvoFecha] = useState("")
  const todayStr = new Date().toISOString().split("T")[0]
  const timestampAInputDate = (ts: Timestamp) =>
    new Date(ts.seconds * 1000).toISOString().split("T")[0]

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
        setProductos(snap.docs.map((d) => {
          const data = d.data()
          const raw = data as Record<string, unknown>
          if (raw.margen !== undefined && raw.descuento === undefined) {
            raw.descuento = raw.margen
          }
          return { id: d.id, ...raw } as ProductoPedido
        }))
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
      const lista: Cliente[] = []
      snap.docs.forEach((d) => {
        mapa[d.id] = d.data().whatsapp || ""
        lista.push({ id: d.id, ...d.data() } as Cliente)
      })
      setWhatsappMap(mapa)
      setClientes(lista)
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteInputRef.current && !clienteInputRef.current.contains(e.target as Node)) {
        setMostrarSugerenciasCliente(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const avanzarEstado = async () => {
    if (!pedido) return
    const sig = SIGUIENTE_ESTADO[pedido.estado]
    if (!sig) return

    if (sig === "entregado_cliente") {
      setNvoFecha(
        pedido.fechaEntregadoCliente
          ? timestampAInputDate(pedido.fechaEntregadoCliente)
          : todayStr
      )
      setRetiroDialogoAbierto(true)
      return
    }

    if (pedido.estado === "borrador" && sig === "comprado") {
      setNvoNumeroGuia(pedido.numeroGuia || "")
      setNvoServicioMensajeria(pedido.servicioMensajeria || "")
      setNvoCostoEnvio(pedido.costoEnvioTotal != null ? String(pedido.costoEnvioTotal) : "")
      setNvoImpuestoCompra(pedido.impuestoCompra != null ? String(pedido.impuestoCompra) : "")
      setNvoDescuentoPedido(pedido.descuentoPedido != null ? String(pedido.descuentoPedido) : "")
      setNvoFecha(
        pedido.fechaCompra
          ? timestampAInputDate(pedido.fechaCompra)
          : todayStr
      )
      setCompraDialogoAbierto(true)
      return
    }

    if (pedido.estado === "casillero_usa" && sig === "transito_usa_ven") {
      setNvoCostoEnvioVnzl(pedido.costoEnvioVnzl != null ? String(pedido.costoEnvioVnzl) : "")
      setNvoNumeroGuiaVnzl(pedido.numeroGuiaVnzl || "")
      setNvoPeso(pedido.pesoLb != null ? String(pedido.pesoLb) : "")
      setNvoVolumen(pedido.volumenLb != null ? String(pedido.volumenLb) : "")
      setNvoMedidaCaja(pedido.medidaCaja || "")
      setNvoFecha(
        pedido.fechaTransitoVen
          ? timestampAInputDate(pedido.fechaTransitoVen)
          : new Date().toISOString().split("T")[0]
      )
      setEnvioVnzlDialogoAbierto(true)
      return
    }

    setNvoFecha(new Date().toISOString().split("T")[0])
    setFechaDialogoObjetivo(sig)
    setFechaDialogoAbierto(true)
  }

  const confirmarCompra = async () => {
    if (!pedido) return
    if (!nvoNumeroGuia.trim()) {
      toast.error("El número de guía es requerido")
      return
    }

    setCreando(true)
    try {
      const data: Record<string, unknown> = {
        numeroGuia: nvoNumeroGuia.trim(),
        fechaCompra: Timestamp.fromDate(new Date(nvoFecha + "T12:00:00")),
      }
      if (nvoServicioMensajeria.trim()) data.servicioMensajeria = nvoServicioMensajeria.trim()
      if (nvoCostoEnvio) data.costoEnvioTotal = Number(nvoCostoEnvio)
      if (nvoImpuestoCompra) data.impuestoCompra = Number(nvoImpuestoCompra)
      if (nvoDescuentoPedido) data.descuentoPedido = Number(nvoDescuentoPedido)

      await pedidosService.actualizar(pedido.id, data)
      await pedidosService.avanzarEstado(pedido.id, "comprado")
      setCompraDialogoAbierto(false)
      toast.success("Pedido comprado")
    } catch {
      toast.error("Error al guardar datos de compra")
    } finally {
      setCreando(false)
    }
  }

  const confirmarEnvioVnzl = async () => {
    if (!pedido) return

    setCreando(true)
    try {
      const data: Record<string, unknown> = {
        numeroGuiaVnzl: nvoNumeroGuiaVnzl.trim() || undefined,
        pesoLb: nvoPeso ? Number(nvoPeso) : undefined,
        volumenLb: nvoVolumen ? Number(nvoVolumen) : undefined,
        medidaCaja: nvoMedidaCaja.trim() || undefined,
        fechaTransitoVen: Timestamp.fromDate(new Date(nvoFecha + "T12:00:00")),
      }
      if (nvoCostoEnvioVnzl) data.costoEnvioVnzl = Number(nvoCostoEnvioVnzl)
      await pedidosService.actualizar(pedido.id, data)
      await pedidosService.avanzarEstado(pedido.id, "transito_usa_ven")
      setEnvioVnzlDialogoAbierto(false)
      toast.success("Pedido avanzó a En Tránsito (USA → Venezuela)")
    } catch {
      toast.error("Error al guardar costo de envío")
    } finally {
      setCreando(false)
    }
  }

  const MAPA_FECHA_AVANCE: Record<string, string> = {
    transito_china_usa: "fechaTransitoChina",
    casillero_usa: "fechaCasillero",
    entregado_ven: "fechaEntregadoVen",
  }

  const confirmarFechaAvance = async () => {
    if (!pedido || !fechaDialogoObjetivo) return
    const campoFecha = MAPA_FECHA_AVANCE[fechaDialogoObjetivo]
    if (!campoFecha) return

    setCreando(true)
    try {
      await pedidosService.actualizar(pedido.id, {
        [campoFecha]: Timestamp.fromDate(new Date(nvoFecha + "T12:00:00")),
      })
      await pedidosService.avanzarEstado(pedido.id, fechaDialogoObjetivo as EstadoPedido)
      setFechaDialogoAbierto(false)
      toast.success(
        `Pedido avanzó a ${ESTADOS_PEDIDO.find((e) => e.valor === fechaDialogoObjetivo)?.etiqueta}`
      )
    } catch {
      toast.error("Error al guardar fecha")
    } finally {
      setCreando(false)
    }
  }

  const confirmarRetiro = async () => {
    if (!pedido) return
    setRetiroDialogoAbierto(false)

    const pendientes = productos.filter((p) => !p.retirado)
    if (pendientes.length === 0) {
      await pedidosService.actualizar(pedido.id, {
        fechaEntregadoCliente: Timestamp.fromDate(new Date(nvoFecha + "T12:00:00")),
      })
      await pedidosService.avanzarEstado(pedido.id, "entregado_cliente")
      toast.success("Pedido retirado")
      return
    }

    try {
      await pedidosService.actualizar(pedido.id, {
        fechaEntregadoCliente: Timestamp.fromDate(new Date(nvoFecha + "T12:00:00")),
      })
      const porCliente = new Map<string, { clienteNombre: string; clienteRef?: string; clienteWhatsapp?: string; articulos: { articuloNombre: string; cantidad: number; precioVenta: number }[] }>()
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
          const clave = prod.clienteRef || prod.clienteNombre || ""
          if (!porCliente.has(clave)) {
            porCliente.set(clave, {
              clienteNombre: prod.clienteNombre || "",
              clienteRef: prod.clienteRef,
              clienteWhatsapp: prod.clienteWhatsapp,
              articulos: [],
            })
          } else {
            const grupo = porCliente.get(clave)!
            if (!grupo.clienteWhatsapp && prod.clienteWhatsapp) grupo.clienteWhatsapp = prod.clienteWhatsapp
          }
          porCliente.get(clave)!.articulos.push({
            articuloNombre: prod.nombre,
            cantidad: prod.cantidad,
            precioVenta: prod.precioVenta || prod.precioUnitario * prod.cantidad,
          })
        }

        if (prod.id) {
          await productosService.actualizar(pedido.id, prod.id, { retirado: true })
        }
      }

      for (const grupo of porCliente.values()) {
        const ventaData: Record<string, unknown> = {
          articulos: grupo.articulos,
          clienteNombre: grupo.clienteNombre,
          estatusEntrega: "por_entregar",
          estatusPago: "por_pagar",
        }
        if (grupo.clienteRef) {
          ventaData.clienteId = grupo.clienteRef
          const cliente = await clientesService.obtener(grupo.clienteRef)
          if (cliente?.whatsapp) ventaData.clienteWhatsapp = cliente.whatsapp
        } else {
          const clienteExistente = clientes.find((c) => c.nombre === grupo.clienteNombre)
          if (clienteExistente) {
            ventaData.clienteId = clienteExistente.id
          } else if (grupo.clienteWhatsapp) {
            const refCliente = await clientesService.crear({
              nombre: grupo.clienteNombre,
              whatsapp: grupo.clienteWhatsapp,
            })
            ventaData.clienteId = refCliente.id
          }
          if (grupo.clienteWhatsapp) ventaData.clienteWhatsapp = grupo.clienteWhatsapp
        }
        await ventasService.crear(ventaData as Parameters<typeof ventasService.crear>[0])
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

  const validarProductoForm = (): boolean => {
    if (!nvoNombre) {
      toast.error("El nombre del producto es requerido")
      return false
    }
    if (nvoTipo === "cliente" && !nvoCliente) {
      toast.error("El nombre del cliente es requerido")
      return false
    }

    const cantidad = Number(nvoCantidad) || 0
    if (cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return false
    }
    const precioUnitario = Number(nvoPrecio) || 0
    const envio = Number(nvoEnvio) || 0
    const descuento = Number(nvoDescuento) || 0
    const precioPorArticulo = (cantidad * precioUnitario + envio - descuento) / cantidad
    const precioVenta = nvoPrecioVenta ? Number(nvoPrecioVenta) : undefined

    if (nvoTipo === "cliente" && precioVenta !== undefined && precioVenta < precioPorArticulo) {
      toast.error("El precio de venta no puede ser menor al precio por artículo")
      return false
    }
    return true
  }

  const agregarAlCarrito = () => {
    if (!validarProductoForm()) return

    const cantidad = Number(nvoCantidad) || 0
    const precioUnitario = Number(nvoPrecio) || 0
    const envio = Number(nvoEnvio) || 0
    const descuento = Number(nvoDescuento) || 0
    const precioVenta = nvoPrecioVenta ? Number(nvoPrecioVenta) : undefined

    const nuevoProducto: ProductoCarrito = {
      nombre: nvoNombre,
      cantidad,
      precioUnitario,
      precioVenta,
      descuento,
      envioCliente: envio,
      tipoProducto: nvoTipo,
      clienteNombre: nvoTipo === "cliente" ? nvoCliente : "",
      clienteWhatsapp: nvoTipo === "cliente" ? nvoTelefonoCliente.trim() || undefined : undefined,
      estadoPago: nvoTipo === "cliente" ? nvoEstadoPago : "sin_pagar",
      montoPagado: nvoEstadoPago === "parcial" ? Number(nvoMontoPagado) || 0 : undefined,
    }

    setCarritoProductos((prev) => [...prev, nuevoProducto])
    setNvoNombre("")
    setNvoCantidad("")
    setNvoPrecio("")
    setNvoDescuento("")
    setNvoEnvio("")
    setNvoPrecioVenta("")
    setNvoEstadoPago("sin_pagar")
    setNvoMontoPagado("")
    setNvoTelefonoCliente("")
  }

  const quitarDelCarrito = (indice: number) => {
    setCarritoProductos((prev) => prev.filter((_, i) => i !== indice))
  }

  const agregarProducto = async () => {
    if (productoEditando) {
      if (!validarProductoForm()) return
      const cantidad = Number(nvoCantidad) || 0
      const precioUnitario = Number(nvoPrecio) || 0
      const envio = Number(nvoEnvio) || 0
      const descuento = Number(nvoDescuento) || 0
      const precioVenta = nvoPrecioVenta ? Number(nvoPrecioVenta) : undefined

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
        data.descuento = descuento
        if (estadoPago === "parcial") {
          data.montoPagado = Number(nvoMontoPagado) || 0
        }
        if (nvoTipo === "cliente") {
          data.clienteNombre = nvoCliente
          if (nvoTelefonoCliente.trim()) data.clienteWhatsapp = nvoTelefonoCliente.trim()
        } else {
          data.clienteNombre = ""
        }

        await productosService.actualizar(id, productoEditando, data)
        toast.success("Producto actualizado")
        limpiarFormulario()
        setDialogoAbierto(false)
      } catch {
        toast.error("Error al guardar producto")
      } finally {
        setCreando(false)
      }
      return
    }

    if (carritoProductos.length === 0) {
      toast.error("Agrega al menos un producto al carrito")
      return
    }

    setCreando(true)
    try {
      for (const prod of carritoProductos) {
        const data: Record<string, unknown> = {
          nombre: prod.nombre,
          cantidad: prod.cantidad,
          precioUnitario: prod.precioUnitario,
          tipoProducto: prod.tipoProducto,
          estadoPago: prod.estadoPago,
        }
        if (prod.precioVenta !== undefined) data.precioVenta = prod.precioVenta
        if (prod.envioCliente) data.envioCliente = prod.envioCliente
        data.descuento = prod.descuento
        if (prod.estadoPago === "parcial") {
          data.montoPagado = prod.montoPagado || 0
        }
        data.clienteNombre = prod.clienteNombre || ""
        if (prod.clienteWhatsapp) data.clienteWhatsapp = prod.clienteWhatsapp
        await productosService.agregar(id, data as Parameters<typeof productosService.agregar>[1])
      }
      toast.success(`${carritoProductos.length} producto${carritoProductos.length > 1 ? "s" : ""} agregado${carritoProductos.length > 1 ? "s" : ""} al pedido`)
      limpiarFormulario()
      setCarritoProductos([])
      setDialogoAbierto(false)
    } catch {
      toast.error("Error al guardar productos")
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
    setNvoDescuento("")
    setNvoCliente("")
    setNvoTelefonoCliente("")
    setNvoEnvio("")
    setNvoPrecioVenta("")
    setNvoEstadoPago("sin_pagar")
    setNvoMontoPagado("")
    setCarritoProductos([])
    setProductoEditando(null)
  }

  const abrirEdicion = (prod: ProductoPedido) => {
    setCarritoProductos([])
    setNvoNombre(prod.nombre)
    setNvoCantidad(String(prod.cantidad))
    setNvoPrecio(String(prod.precioUnitario))
    setNvoDescuento(prod.descuento != null ? String(prod.descuento) : "")
    setNvoCliente(prod.clienteNombre || "")
    setNvoTelefonoCliente(prod.clienteWhatsapp || "")
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
  const costoTotal = productos.reduce((s, p) => s + (p.precioUnitario * p.cantidad) + (p.envioCliente || 0) - (p.descuento || 0), 0)

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
                <Button variant="outline" size="sm" onClick={retrocederEstado} className="dark:bg-muted dark:text-muted-foreground dark:border-none">
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
              const fechaAvance = (() => {
                if (est === "borrador") return pedido.fechaCreacion
                if (est === "comprado") return pedido.fechaCompra
                if (est === "transito_china_usa") return pedido.fechaTransitoChina
                if (est === "casillero_usa") return pedido.fechaCasillero
                if (est === "transito_usa_ven") return pedido.fechaTransitoVen
                if (est === "entregado_ven") return pedido.fechaEntregadoVen
                if (est === "entregado_cliente") return pedido.fechaEntregadoCliente
                return undefined
              })()
              return (
                <div key={est} className="flex flex-col flex-1 min-w-[120px] gap-1.5">
                  <div className="flex items-center gap-1.5">
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
                  {fechaAvance && completado && (
                    <span className="text-[10px] text-primary text-center leading-tight">
                      {formatearFecha(fechaAvance)}
                    </span>
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
              <h2 className="text-lg font-bold text-foreground dark:text-white">Productos</h2>
            </div>
            {esBorrador && (
              <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-5xl overflow-y-auto max-h-[92dvh]">
                  <DialogHeader>
                    <DialogTitle>{productoEditando ? "Editar Producto" : "Agregar Producto"}</DialogTitle>
                    <DialogDescription className="sr-only">
                      {productoEditando ? "Edita el producto en el pedido" : "Agrega uno o varios productos al pedido"}
                    </DialogDescription>
                  </DialogHeader>
                  {productoEditando ? (
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
                              value={nvoDescuento}
                              onChange={(e) => setNvoDescuento(e.target.value)}
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
                          {Number(nvoDescuento) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Descuento</span>
                              <span className="text-green-600">-{formatearMoneda(Number(nvoDescuento))}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium border-t pt-2 mt-2">
                            <span>Total</span>
                            <span>
                              {formatearMoneda(
                                (Number(nvoCantidad) || 0) * (Number(nvoPrecio) || 0) +
                                (Number(nvoEnvio) || 0) -
                                (Number(nvoDescuento) || 0)
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
                                      (Number(nvoDescuento) || 0)) / Number(nvoCantidad)
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
                            {!clientes.some((c) => c.nombre.toLowerCase() === nvoCliente.trim().toLowerCase()) && nvoCliente.trim() && (
                              <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground">Teléfono (opcional)</Label>
                                <Input
                                  placeholder="Ej: 584121234567"
                                  value={nvoTelefonoCliente}
                                  onChange={(e) => setNvoTelefonoCliente(e.target.value)}
                                />
                              </div>
                            )}
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
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
                      <div className="md:col-span-3 space-y-4">
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
                            onClick={() => { setNvoTipo("inventario"); setNvoTelefonoCliente("") }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                              nvoTipo === "inventario" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Mi stock
                          </button>
                        </div>

                        {nvoTipo === "cliente" && (
                          <div className="space-y-3" ref={clienteInputRef}>
                            <Label>Cliente</Label>
                            <Input
                              value={nvoCliente}
                              onChange={(e) => { setNvoCliente(e.target.value); setMostrarSugerenciasCliente(true) }}
                              onFocus={() => setMostrarSugerenciasCliente(true)}
                              placeholder="Nombre del cliente"
                            />
                            {mostrarSugerenciasCliente && nvoCliente && (
                              <div className="rounded-lg border bg-popover p-1 shadow-md max-h-40 overflow-y-auto">
                                {clientes
                                  .filter((c) => c.nombre.toLowerCase().includes(nvoCliente.toLowerCase()))
                                  .map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                                      onClick={() => { setNvoCliente(c.nombre); setNvoTelefonoCliente(""); setMostrarSugerenciasCliente(false) }}
                                    >
                                      <span className="font-medium">{c.nombre}</span>
                                      <span className="text-muted-foreground ml-2">{c.whatsapp}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                            {!clientes.some((c) => c.nombre.toLowerCase() === nvoCliente.trim().toLowerCase()) && nvoCliente.trim() && (
                              <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground">Teléfono (opcional)</Label>
                                <Input
                                  placeholder="Ej: 584121234567"
                                  value={nvoTelefonoCliente}
                                  onChange={(e) => setNvoTelefonoCliente(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        )}

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
                              value={nvoDescuento}
                              onChange={(e) => setNvoDescuento(e.target.value)}
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

                        {nvoTipo === "cliente" && (
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
                        )}

                        {nvoTipo === "cliente" && nvoEstadoPago === "parcial" && (
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

                        <Button
                          type="button"
                          onClick={agregarAlCarrito}
                          className="w-full gap-2"
                          disabled={creando}
                        >
                          <Plus className="h-4 w-4" />
                          Agregar al pedido
                        </Button>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        {carritoProductos.length > 0 && (
                          <div className="rounded-lg border bg-muted/50 overflow-hidden">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b border-border/60">
                              Productos por agregar ({carritoProductos.length})
                            </p>
                            <div className="divide-y divide-border/60">
                              {carritoProductos.map((prod, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{prod.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {prod.cantidad} × {formatearMoneda(prod.precioUnitario)}
                                      {prod.tipoProducto === "cliente" && (
                                        <span className="text-muted-foreground"> · {prod.clienteNombre}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-semibold">
                                      {formatearMoneda(prod.cantidad * prod.precioUnitario + prod.envioCliente - prod.descuento)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => quitarDelCarrito(i)}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                      title="Quitar producto"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between font-medium px-4 py-2.5 border-t border-border/60 text-sm">
                              <span>Total del pedido</span>
                              <span>
                                {formatearMoneda(
                                  carritoProductos.reduce(
                                    (s, p) => s + p.cantidad * p.precioUnitario + p.envioCliente - p.descuento,
                                    0
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {carritoProductos.length === 0 && (
                          <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                            Aún no has agregado productos. Completa el formulario y pulsa "Agregar al pedido".
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
                      carritoProductos.length > 0
                        ? `Guardar en el pedido (${carritoProductos.length})`
                        : "Guardar en el pedido"
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
                        <TableCell className="text-right text-red-600">
                          {prod.descuento != null
                            ? formatearMoneda(prod.descuento)
                            : !esInventario
                              ? formatearMoneda(0)
                              : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {prod.envioCliente ? formatearMoneda(prod.envioCliente) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatearMoneda(totalProd + (prod.envioCliente || 0) - (prod.descuento || 0))}
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

      {(pedido.numeroGuia || pedido.servicioMensajeria || pedido.costoEnvioTotal || pedido.costoEnvioVnzl || pedido.impuestoCompra || pedido.descuentoPedido || pedido.numeroGuiaVnzl || pedido.pesoLb != null || pedido.volumenLb != null || pedido.medidaCaja) && (
        <Card className="card-glow">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Detalles de Compra</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {pedido.numeroGuia && (
                <div>
                  <p className="text-xs text-muted-foreground">N° Guía</p>
                  <p className="text-sm font-medium">{pedido.numeroGuia}</p>
                </div>
              )}
              {pedido.servicioMensajeria && (
                <div>
                  <p className="text-xs text-muted-foreground">Mensajería</p>
                  <p className="text-sm font-medium">{pedido.servicioMensajeria}</p>
                </div>
              )}
              {pedido.costoEnvioTotal != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Costo Envío</p>
                  <p className="text-sm font-medium">{formatearMoneda(pedido.costoEnvioTotal)}</p>
                </div>
              )}
              {pedido.costoEnvioVnzl != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Envío a Vnzl</p>
                  <p className="text-sm font-medium">{formatearMoneda(pedido.costoEnvioVnzl)}</p>
                </div>
              )}
              {pedido.impuestoCompra != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Impuesto</p>
                  <p className="text-sm font-medium">{formatearMoneda(pedido.impuestoCompra)}</p>
                </div>
              )}
              {pedido.descuentoPedido != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Descuento</p>
                  <p className="text-sm font-medium text-red-600">{formatearMoneda(pedido.descuentoPedido)}</p>
                </div>
              )}
              {pedido.numeroGuiaVnzl && (
                <div>
                  <p className="text-xs text-muted-foreground">N° Guía (Vnzl)</p>
                  <p className="text-sm font-medium">{pedido.numeroGuiaVnzl}</p>
                </div>
              )}
              {pedido.pesoLb != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Peso</p>
                  <p className="text-sm font-medium">{pedido.pesoLb} lb</p>
                </div>
              )}
              {pedido.volumenLb != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Volumen</p>
                  <p className="text-sm font-medium">{pedido.volumenLb} lb</p>
                </div>
              )}
              {pedido.medidaCaja && (
                <div>
                  <p className="text-xs text-muted-foreground">Medida de Caja</p>
                  <p className="text-sm font-medium">{pedido.medidaCaja}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-glow">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Resumen Financiero</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Costo Total</p>
              <p className="text-lg font-bold">{formatearMoneda(costoTotal)}</p>
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
                        (p.envioCliente || 0) -
                        (p.descuento || 0) -
                        (p.montoPagado || 0),
                      0
                    )
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Envío por Producto</p>
              <p className="text-lg font-bold">
                {(() => {
                  const unidades = productos.reduce((s, p) => s + p.cantidad, 0)
                  return unidades > 0
                    ? formatearMoneda(((pedido.costoEnvioTotal || 0) + (pedido.costoEnvioVnzl || 0)) / unidades)
                    : "-"
                })()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="text-lg font-bold">{productos.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Productos</p>
              <p className="text-lg font-bold">{productos.reduce((s, p) => s + p.cantidad, 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={fechaDialogoAbierto} onOpenChange={setFechaDialogoAbierto}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Fecha del avance</DialogTitle>
            <DialogDescription>
              Ingresa la fecha para este cambio de estado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <DatePicker value={nvoFecha} onChange={setNvoFecha} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFechaDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarFechaAvance} disabled={creando}>
              {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={compraDialogoAbierto} onOpenChange={setCompraDialogoAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comprar Pedido</DialogTitle>
            <DialogDescription>
              Ingresa los datos de la compra para avanzar el pedido a "Comprado".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Número de Guía <span className="text-destructive">*</span>
              </Label>
              <Input
                value={nvoNumeroGuia}
                onChange={(e) => setNvoNumeroGuia(e.target.value)}
                placeholder="Ej: 1Z999AA10123456784"
              />
            </div>
            <div className="space-y-2">
              <Label>Servicio de Mensajería</Label>
              <Input
                value={nvoServicioMensajeria}
                onChange={(e) => setNvoServicioMensajeria(e.target.value)}
                placeholder="Ej: Zoom, MRW, Tealca"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de compra</Label>
              <DatePicker value={nvoFecha} onChange={setNvoFecha} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Costo Envío</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={nvoCostoEnvio}
                  onChange={(e) => setNvoCostoEnvio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Impuesto</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={nvoImpuestoCompra}
                  onChange={(e) => setNvoImpuestoCompra(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Descuento</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={nvoDescuentoPedido}
                  onChange={(e) => setNvoDescuentoPedido(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompraDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarCompra} disabled={creando}>
              {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar compra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={envioVnzlDialogoAbierto} onOpenChange={setEnvioVnzlDialogoAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Envío a Venezuela</DialogTitle>
            <DialogDescription>
              Ingresa los datos del envío desde USA a Venezuela.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Número de Guía</Label>
              <Input
                value={nvoNumeroGuiaVnzl}
                onChange={(e) => setNvoNumeroGuiaVnzl(e.target.value)}
                placeholder="Ej: 1Z999AA10123456784"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Peso (lb)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={nvoPeso}
                  onChange={(e) => setNvoPeso(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Volumen (lb)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={nvoVolumen}
                  onChange={(e) => setNvoVolumen(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Medida de Caja</Label>
                <Input
                  value={nvoMedidaCaja}
                  onChange={(e) => setNvoMedidaCaja(e.target.value)}
                  placeholder="Ej: 30×20×15 cm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de salida</Label>
                <DatePicker value={nvoFecha} onChange={setNvoFecha} />
              </div>
              <div className="space-y-2">
                <Label>Costo de envío (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={nvoCostoEnvioVnzl}
                  onChange={(e) => setNvoCostoEnvioVnzl(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEnvioVnzlDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarEnvioVnzl} disabled={creando}>
              {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar envío"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          <div className="px-6 pb-4">
            <Label>Fecha de retiro</Label>
            <div className="mt-2">
              <DatePicker value={nvoFecha} onChange={setNvoFecha} />
            </div>
          </div>
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
