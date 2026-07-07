"use client"

import { useState, useEffect, useRef } from "react"
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { clientesService, ventasService } from "@/lib/firebaseServices"
import { formatearMoneda, METODOS_PAGO, ESTATUS_PAGO_VENTA, cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import { ShoppingCart, ChevronsUpDown, Check, Truck } from "lucide-react"
import type { ArticuloTienda, Venta } from "@/lib/types"
import type { Cliente } from "@/lib/types"

interface RegistrarVentaDialogProps {
  articulosEnStock: ArticuloTienda[]
}

export default function RegistrarVentaDialog({ articulosEnStock }: RegistrarVentaDialogProps) {
  const [open, setOpen] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [articuloId, setArticuloId] = useState("")
  const [popoverArticulo, setPopoverArticulo] = useState(false)
  const [popoverCalendario, setPopoverCalendario] = useState(false)
  const [cantidadVenta, setCantidadVenta] = useState("")
  const [clienteNombre, setClienteNombre] = useState("")
  const [telefonoCliente, setTelefonoCliente] = useState("")
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [metodoPago, setMetodoPago] = useState("")
  const [fechaPago, setFechaPago] = useState<Date>(new Date())
  const [estatusPago, setEstatusPago] = useState("por_pagar")
  const [deliveryIncluido, setDeliveryIncluido] = useState(false)
  const [costoDelivery, setCostoDelivery] = useState("")
  const [enviando, setEnviando] = useState(false)
  const clienteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      clientesService.listar().then(setClientes).catch(() => {})
      setMetodoPago("")
      setFechaPago(new Date())
      setEstatusPago("por_pagar")
      setDeliveryIncluido(false)
      setCostoDelivery("")
      setClienteNombre("")
      setTelefonoCliente("")
    }
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const articuloSeleccionado = articulosEnStock.find((a) => a.id === articuloId)

  const sugerenciasClientes = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clienteNombre.toLowerCase())
  )

  function handleCancelar() {
    setOpen(false)
    setArticuloId("")
    setCantidadVenta("")
    setClienteNombre("")
    setTelefonoCliente("")
    setDeliveryIncluido(false)
    setCostoDelivery("")
  }

  async function handleRegistrar() {
    const cantidad = Number(cantidadVenta) || 1
    if (!articuloId || !clienteNombre.trim() || !metodoPago) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    setEnviando(true)
    try {
      const articulo = articuloSeleccionado!
      const clienteExistente = clientes.find((c) => c.nombre === clienteNombre.trim())
      const whatsappFinal = clienteExistente ? clienteExistente.whatsapp : (telefonoCliente || undefined)

      const datosVenta: Record<string, unknown> = {
        articuloId: articulo.id,
        articuloNombre: articulo.nombre,
        cantidad,
        precioVenta: articulo.precioVenta,
        clienteNombre: clienteNombre.trim(),
        metodoPago,
        fechaPago: Timestamp.fromDate(fechaPago),
        estatusPago,
        estatusEntrega: "por_entregar",
      }
      if (deliveryIncluido && Number(costoDelivery) > 0) datosVenta.costoDelivery = Number(costoDelivery)
      if (articulo.codigo) datosVenta.articuloCodigo = articulo.codigo
      if (clienteExistente?.id) datosVenta.clienteId = clienteExistente.id
      if (whatsappFinal) datosVenta.clienteWhatsapp = whatsappFinal

      await ventasService.crear(
        datosVenta as unknown as Omit<Venta, "id" | "creadoEn" | "actualizadoEn">
      )

      const nuevaCantidad = Math.max(0, articulo.cantidad - cantidad)
      const updateData: Record<string, unknown> = {
        cantidad: nuevaCantidad,
        actualizadoEn: serverTimestamp(),
      }
      if (nuevaCantidad === 0) updateData.estado = "vendido"
      await updateDoc(doc(db, "inventario", articulo.id), updateData)

      toast.success("Venta registrada")
      setOpen(false)
      setArticuloId("")
      setCantidadVenta("")
      setClienteNombre("")
      setDeliveryIncluido(false)
      setCostoDelivery("")
    } catch {
      toast.error("Error al registrar venta")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Registrar venta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
          <DialogDescription>
            Selecciona el artículo vendido y los datos de pago.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <Label>Artículo</Label>
            {articulosEnStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No hay artículos en stock.</p>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Popover open={popoverArticulo} onOpenChange={setPopoverArticulo}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-[50px]">
                        {articuloSeleccionado
                          ? `${articuloSeleccionado.nombre} — ${formatearMoneda(articuloSeleccionado.precioVenta)}`
                          : "Seleccionar artículo..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar artículo..." />
                        <CommandList>
                          <CommandEmpty>Sin resultados</CommandEmpty>
                          <CommandGroup>
                            {articulosEnStock.map((a) => (
                              <CommandItem
                                key={a.id}
                                value={`${a.nombre} ${a.codigo || ""}`}
                                onSelect={() => { setArticuloId(a.id); setPopoverArticulo(false) }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", articuloId === a.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-1 justify-between items-center">
                                  <span>{a.nombre}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {formatearMoneda(a.precioVenta)} · Stock: {a.cantidad}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-20 space-y-3">
                  <Label className="text-xs">Cant.</Label>
                  <Input type="number" min={1} placeholder="1" value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3" ref={clienteRef}>
            <Label>Cliente</Label>
            <Input
              placeholder="Nombre del cliente"
              value={clienteNombre}
              onChange={(e) => { setClienteNombre(e.target.value); setMostrarSugerencias(true) }}
              onFocus={() => setMostrarSugerencias(true)}
            />
            {mostrarSugerencias && clienteNombre && sugerenciasClientes.length > 0 && (
              <div className="rounded-lg border bg-popover p-1 shadow-md max-h-40 overflow-y-auto">
                {sugerenciasClientes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    onClick={() => { setClienteNombre(c.nombre); setTelefonoCliente(""); setMostrarSugerencias(false) }}
                  >
                    <span className="font-medium">{c.nombre}</span>
                    <span className="text-muted-foreground ml-2">{c.whatsapp}</span>
                  </button>
                ))}
              </div>
            )}
            {!clientes.find((c) => c.nombre === clienteNombre.trim()) && clienteNombre.trim() && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Teléfono (opcional)</Label>
                <Input
                  placeholder="Ej: 584121234567"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Método de pago</Label>
            <Select value={metodoPago} onValueChange={setMetodoPago}>
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

          <div className="space-y-3">
            <Label>Fecha de pago</Label>
            <Popover open={popoverCalendario} onOpenChange={setPopoverCalendario}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-[50px] gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{format(fechaPago, "PPP", { locale: es })}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaPago}
                  onSelect={(d) => { if (d) { setFechaPago(d); setPopoverCalendario(false) } }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <Label>Estatus</Label>
            <Select value={estatusPago} onValueChange={setEstatusPago}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTATUS_PAGO_VENTA.map((e) => (
                  <SelectItem key={e.valor} value={e.valor}>{e.etiqueta}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer">Incluye delivery</Label>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={deliveryIncluido}
                onClick={() => setDeliveryIncluido(!deliveryIncluido)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  deliveryIncluido ? "bg-primary" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    deliveryIncluido ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
            {deliveryIncluido && (
              <div className="space-y-3 pl-6">
                <Label>Costo de delivery (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={costoDelivery}
                  onChange={(e) => setCostoDelivery(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar}>Cancelar</Button>
          <Button onClick={handleRegistrar} disabled={!articuloId || !clienteNombre.trim() || !metodoPago || enviando}>
            {enviando ? "Registrando..." : "Registrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
