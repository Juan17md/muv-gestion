import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatearMoneda(cantidad: number): string {
  return new Intl.NumberFormat("es-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cantidad)
}

export function formatearFecha(timestamp: { seconds: number } | Date | string | undefined | null): string {
  if (!timestamp) return "-"
  const date = timestamp instanceof Date ? timestamp : new Date((timestamp as { seconds: number }).seconds * 1000)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function calcularDiasEstancado(timestamp: { seconds: number } | Date): number {
  const ahora = Date.now()
  const fecha = timestamp instanceof Date ? timestamp.getTime() : timestamp.seconds * 1000
  return Math.floor((ahora - fecha) / (1000 * 60 * 60 * 24))
}

export const ESTADOS_PEDIDO = [
  { valor: "borrador", etiqueta: "Borrador", color: "bg-muted text-muted-foreground" },
  { valor: "comprado", etiqueta: "Comprado", color: "bg-blue-100 text-blue-700" },
  { valor: "transito_china_usa", etiqueta: "En Tránsito (CN→US)", color: "bg-indigo-100 text-indigo-700" },
  { valor: "casillero_usa", etiqueta: "En Casillero (USA)", color: "bg-cyan-100 text-cyan-700" },
  { valor: "transito_usa_ven", etiqueta: "En Tránsito (US→VE)", color: "bg-violet-100 text-violet-700" },
  { valor: "entregado_ven", etiqueta: "Entregado VEN", color: "bg-amber-100 text-amber-700" },
  { valor: "entregado_cliente", etiqueta: "Retirado", color: "bg-emerald-100 text-emerald-700" },
  { valor: "cerrado", etiqueta: "Cerrado", color: "bg-muted text-muted-foreground" },
] as const

export const ESTADOS_PAGO = [
  { valor: "sin_pagar", etiqueta: "Sin Pagar", color: "bg-red-100 text-red-700" },
  { valor: "parcial", etiqueta: "Parcial", color: "bg-yellow-100 text-yellow-700" },
  { valor: "pagado", etiqueta: "Pagado", color: "bg-emerald-100 text-emerald-700" },
] as const

export const ESTADOS_ARTICULO = [
  { valor: "en_stock", etiqueta: "En Stock", color: "bg-emerald-100 text-emerald-700" },
  { valor: "vendido", etiqueta: "Vendido", color: "bg-blue-100 text-blue-700" },
  { valor: "apartado", etiqueta: "Apartado", color: "bg-yellow-100 text-yellow-700" },
] as const

export const METODOS_PAGO = [
  { valor: "pago_movil", etiqueta: "Pago Móvil" },
  { valor: "efectivo_usd", etiqueta: "Efectivo $" },
  { valor: "dolares_digitales", etiqueta: "Dólares Digitales" },
] as const

export const ESTATUS_PAGO_VENTA = [
  { valor: "por_pagar", etiqueta: "Por pagar" },
  { valor: "pagado", etiqueta: "Pagado" },
] as const

export const ESTATUS_ENTREGA = [
  { valor: "por_entregar", etiqueta: "Por entregar" },
  { valor: "entregado", etiqueta: "Entregado" },
] as const

export const SIGUIENTE_ESTADO: Record<string, string> = {
  borrador: "comprado",
  comprado: "transito_china_usa",
  transito_china_usa: "casillero_usa",
  casillero_usa: "transito_usa_ven",
  transito_usa_ven: "entregado_ven",
  entregado_ven: "entregado_cliente",
}
