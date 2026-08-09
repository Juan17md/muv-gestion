"use client"

import { useState, useEffect, useRef } from "react"
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { clientesService, ventasService } from "@/lib/firebaseServices"
import { formatearMoneda, METODOS_PAGO, ESTATUS_PAGO_VENTA, cn, obtenerPrecioConDescuento } from "@/lib/utils"
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
import { ShoppingCart, ChevronsUpDown, Check, Truck, Clock, Plus, Trash2 } from "lucide-react"
import type { ArticuloTienda, Venta, ArticuloVenta } from "@/lib/types"
import type { Cliente } from "@/lib/types"

interface RegistrarVentaDialogProps {
  articulosEnStock: ArticuloTienda[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface LineaCarrito extends ArticuloVenta {
  stockOriginal: number
}

export default function RegistrarVentaDialog({ articulosEnStock, open: openProp, onOpenChange }: RegistrarVentaDialogProps) {
  const [openInterno, setOpenInterno] = useState(false)
  const open = openProp ?? openInterno
  const setOpen = onOpenChange ?? setOpenInterno
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [articuloId, setArticuloId] = useState("")
  const [popoverArticulo, setPopoverArticulo] = useState(false)
  const [popoverCalendario, setPopoverCalendario] = useState(false)
  const [cantidadVenta, setCantidadVenta] = useState("")
  const [tipoDescuento, setTipoDescuento] = useState<"porcentaje" | "monto">("porcentaje")
  const [descuentoValor, setDescuentoValor] = useState("")
  const [clienteNombre, setClienteNombre] = useState("")
  const [telefonoCliente, setTelefonoCliente] = useState("")
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [metodoPago, setMetodoPago] = useState("")
  const [fechaPago, setFechaPago] = useState<Date>(new Date())
  const [estatusPago, setEstatusPago] = useState("por_pagar")
  const [fiado, setFiado] = useState(false)
  const [deliveryIncluido, setDeliveryIncluido] = useState(false)
  const [costoDelivery, setCostoDelivery] = useState("")
  const [enviando, setEnviando] = useState(false)
  const clienteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      clientesService.listar().then(setClientes).catch(() => {})
      setCarrito([])
      setMetodoPago("")
      setFechaPago(new Date())
      setEstatusPago("por_pagar")
      setFiado(false)
      setDeliveryIncluido(false)
      setCostoDelivery("")
      setClienteNombre("")
      setTelefonoCliente("")
      setArticuloId("")
      setCantidadVenta("")
      setTipoDescuento("porcentaje")
      setDescuentoValor("")
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

  const subtotalCarrito = carrito.reduce(
    (suma, linea) => suma + obtenerPrecioConDescuento(linea) * linea.cantidad,
    0
  )
  const totalDescuentos = carrito.reduce(
    (suma, linea) => suma + (linea.precioVenta - obtenerPrecioConDescuento(linea)) * linea.cantidad,
    0
  )

  function stockDisponible(articulo: ArticuloTienda): number {
    const enCarrito = carrito
      .filter((l) => l.articuloId === articulo.id)
      .reduce((s, l) => s + l.cantidad, 0)
    return Math.max(0, articulo.cantidad - enCarrito)
  }

  function handleAgregarArticulo() {
    if (!articuloSeleccionado) {
      toast.error("Selecciona un artículo")
      return
    }
    const cantidad = Number(cantidadVenta) || 1
    const disponible = stockDisponible(articuloSeleccionado)
    if (cantidad > disponible) {
      toast.error(`Stock insuficiente: quedan ${disponible} disponible(s)`)
      return
    }

    const descuentoVal = Number(descuentoValor) || 0
    const linea: LineaCarrito = {
      articuloId: articuloSeleccionado.id,
      articuloNombre: articuloSeleccionado.nombre,
      articuloCodigo: articuloSeleccionado.codigo,
      cantidad,
      precioVenta: articuloSeleccionado.precioVenta,
      costo: articuloSeleccionado.costo,
      descuento: tipoDescuento === "porcentaje" ? descuentoVal : undefined,
      descuentoMonto: tipoDescuento === "monto" ? descuentoVal : undefined,
      stockOriginal: articuloSeleccionado.cantidad,
    }

    const existente = carrito.find((l) => l.articuloId === articuloSeleccionado.id)
    if (existente) {
      setCarrito(carrito.map((l) => (l.articuloId === existente.articuloId ? { ...l, cantidad: l.cantidad + cantidad } : l)))
    } else {
      setCarrito([...carrito, linea])
    }
    setArticuloId("")
    setCantidadVenta("")
    setDescuentoValor("")
    setTipoDescuento("porcentaje")
  }

  function handleQuitarArticulo(articuloId: string) {
    setCarrito(carrito.filter((l) => l.articuloId !== articuloId))
  }

  function handleCancelar() {
    setOpen(false)
    setCarrito([])
    setClienteNombre("")
    setTelefonoCliente("")
    setDeliveryIncluido(false)
    setCostoDelivery("")
    setArticuloId("")
    setCantidadVenta("")
    setDescuentoValor("")
  }

  async function handleRegistrar() {
    if (carrito.length === 0 || !clienteNombre.trim() || (!fiado && !metodoPago)) {
      toast.error("Completa los campos requeridos: cliente y al menos un artículo")
      return
    }

    setEnviando(true)
    try {
      let clienteExistente = clientes.find((c) => c.nombre === clienteNombre.trim())
      let clienteId: string | undefined = clienteExistente?.id
      const whatsappFinal = clienteExistente?.whatsapp || telefonoCliente.trim() || undefined

      if (!clienteExistente) {
        const refCliente = await clientesService.crear({
          nombre: clienteNombre.trim(),
          whatsapp: telefonoCliente.trim() || "",
        } as never)
        clienteId = refCliente.id
      }

      const articulosVenta: ArticuloVenta[] = carrito.map((l) => ({
        articuloId: l.articuloId,
        articuloNombre: l.articuloNombre,
        articuloCodigo: l.articuloCodigo,
        cantidad: l.cantidad,
        precioVenta: l.precioVenta,
        costo: l.costo,
        descuento: l.descuento,
        descuentoMonto: l.descuentoMonto,
      }))

      const datosVenta: Record<string, unknown> = {
        articulos: articulosVenta,
        clienteId,
        clienteNombre: clienteNombre.trim(),
        metodoPago: fiado ? undefined : metodoPago,
        fechaPago: fiado ? undefined : Timestamp.fromDate(fechaPago),
        estatusPago,
        estatusEntrega: "por_entregar",
        fiado: fiado || undefined,
      }
      if (deliveryIncluido && Number(costoDelivery) > 0) datosVenta.costoDelivery = Number(costoDelivery)
      if (whatsappFinal) datosVenta.clienteWhatsapp = whatsappFinal

      await ventasService.crear(
        datosVenta as unknown as Omit<Venta, "id" | "creadoEn" | "actualizadoEn">
      )

      for (const linea of carrito) {
        const articulo = articulosEnStock.find((a) => a.id === linea.articuloId)
        if (!articulo) continue
        const nuevaCantidad = Math.max(0, articulo.cantidad - linea.cantidad)
        const updateData: Record<string, unknown> = {
          cantidad: nuevaCantidad,
          actualizadoEn: serverTimestamp(),
        }
        if (nuevaCantidad === 0) updateData.estado = "vendido"
        await updateDoc(doc(db, "inventario", articulo.id), updateData)
      }

      toast.success("Venta registrada")
      setOpen(false)
      setCarrito([])
      setClienteNombre("")
      setTelefonoCliente("")
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
      {openProp === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Registrar venta
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-5xl overflow-y-auto max-h-[92dvh]">
        <DialogHeader>
          <DialogTitle>Registrar Venta</DialogTitle>
          <DialogDescription>
            Ingresa los datos del cliente y agrega los artículos vendidos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
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
              <Label>Agregar artículo</Label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                  {articulosEnStock.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No hay artículos en stock.</p>
                  ) : (
                    <Popover open={popoverArticulo} onOpenChange={setPopoverArticulo}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between h-[50px]">
                          {articuloSeleccionado
                            ? `${articuloSeleccionado.nombre} — ${formatearMoneda(articuloSeleccionado.precioVenta)}`
                            : "Seleccionar artículo..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0"
                        align="start"
                        side="bottom"
                        style={{ width: 'calc(var(--radix-popover-trigger-width) * 2)' }}
                      >
                        <Command>
                          <CommandInput placeholder="Buscar artículo..." />
                          <CommandList className="max-h-56 md:max-h-72">
                            <CommandEmpty>Sin resultados</CommandEmpty>
                            <CommandGroup>
                              {articulosEnStock.map((a, i) => {
                                const disponible = stockDisponible(a)
                                return (
                                  <CommandItem
                                    key={a.id}
                                    value={`${a.nombre} ${a.codigo || ""}`}
                                    disabled={disponible === 0}
                                    onSelect={() => { setArticuloId(a.id); setPopoverArticulo(false) }}
                                    className={cn(i % 2 !== 0 ? "bg-muted/15" : "", disponible === 0 && "opacity-50")}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", articuloId === a.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-1 justify-between items-center">
                                      <span>{a.nombre}</span>
                                      <span className="text-sm text-muted-foreground ml-2">
                                        {formatearMoneda(a.precioVenta)} · Stock: {disponible}
                                      </span>
                                    </div>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-32">
                  <Label className="text-xs text-muted-foreground">Descuento</Label>
                  <Select value={tipoDescuento} onValueChange={(v) => setTipoDescuento(v as "porcentaje" | "monto")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="porcentaje">%</SelectItem>
                      <SelectItem value="monto">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                  <Input
                    type="number"
                    min={0}
                    step={tipoDescuento === "porcentaje" ? 1 : 0.01}
                    placeholder={tipoDescuento === "porcentaje" ? "Ej: 10%" : "Ej: 5.00"}
                    value={descuentoValor}
                    onChange={(e) => setDescuentoValor(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Cantidad</Label>
                  <Input type="number" min={1} placeholder="1" value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value)} />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">&nbsp;</Label>
                  <Button type="button" onClick={handleAgregarArticulo} disabled={!articuloId || !articulosEnStock.length} className="gap-2 w-full h-[50px]">
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>

            {carrito.length > 0 && (
              <div className="rounded-lg border bg-muted/50 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                  <span>Artículo</span>
                  <span className="text-right">Cant.</span>
                  <span className="text-right">Precio orig.</span>
                  <span className="text-right">Precio</span>
                  <span className="text-right">Subtotal</span>
                </div>
                <div className="divide-y divide-border/60">
                  {carrito.map((linea) => (
                    <div key={linea.articuloId} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{linea.articuloNombre}</p>
                        {(linea.descuento || linea.descuentoMonto) && (
                          <p className="text-xs text-primary">
                            {linea.descuento ? `Descuento ${linea.descuento}%` : `Descuento ${formatearMoneda(linea.descuentoMonto || 0)}`}
                          </p>
                        )}
                      </div>
                      <span className="text-right tabular-nums">{linea.cantidad}</span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {formatearMoneda(linea.precioVenta)}
                      </span>
                      <span className="text-right tabular-nums text-primary">
                        {formatearMoneda(obtenerPrecioConDescuento(linea))}
                      </span>
                      <div className="flex items-center justify-end gap-3">
                        <span className="font-semibold tabular-nums">
                          {formatearMoneda(obtenerPrecioConDescuento(linea) * linea.cantidad)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuitarArticulo(linea.articuloId!)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Quitar artículo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Resumen
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatearMoneda(subtotalCarrito)}</span>
              </div>
              {totalDescuentos > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Descuentos</span>
                  <span>−{formatearMoneda(totalDescuentos)}</span>
                </div>
              )}
              {deliveryIncluido && Number(costoDelivery) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>+{formatearMoneda(Number(costoDelivery))}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-2 mt-2">
                <span>Total</span>
                <span>
                  {formatearMoneda(
                    subtotalCarrito +
                    (deliveryIncluido ? Number(costoDelivery) : 0)
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="cursor-pointer">Fiado</Label>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={fiado}
                onClick={() => setFiado(!fiado)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  fiado ? "bg-primary" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                    fiado ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {!fiado && (
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
            )}

            {!fiado && (
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
            )}

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
                <div className="space-y-3">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar}>Cancelar</Button>
          <Button onClick={handleRegistrar} disabled={carrito.length === 0 || !clienteNombre.trim() || (!fiado && !metodoPago) || enviando}>
            {enviando ? "Registrando..." : "Registrar venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
