import type { Timestamp } from "firebase/firestore"

export interface Cliente {
  id: string
  nombre: string
  whatsapp: string
  notas?: string
  creadoEn: Timestamp
  actualizadoEn: Timestamp
}

export interface Tienda {
  id: string
  nombre: string
  notas?: string
  creadoEn: Timestamp
  actualizadoEn: Timestamp
}

export interface ProductoPedido {
  id?: string
  nombre: string
  cantidad: number
  precioUnitario: number
  precioVenta?: number
  margen?: number
  envioCliente?: number
  clienteRef?: string
  clienteNombre: string
  tipoProducto?: "cliente" | "inventario"
  retirado?: boolean
  estadoPago: "sin_pagar" | "parcial" | "pagado"
  montoPagado?: number
  creadoEn: Timestamp
}

export interface Pedido {
  id: string
  tiendaRef: string
  tiendaNombre: string
  estado: string
  ubicacion: string
  costoEnvioTotal?: number
  montoTotal?: number
  gananciaTotal?: number
  fechaCreacion: Timestamp
  fechaCompra?: Timestamp
  fechaCierre?: Timestamp
  actualizadoEn: Timestamp
}

export type EstadoPedido =
  | "borrador"
  | "comprado"
  | "transito_china_usa"
  | "casillero_usa"
  | "transito_usa_ven"
  | "entregado_ven"
  | "entregado_cliente"
  | "cerrado"

export type EstadoPago = "sin_pagar" | "parcial" | "pagado"

export interface ArticuloTienda {
  id: string
  nombre: string
  cantidad: number
  precioVenta: number
  costo: number
  tiendaCompra?: string
  codigo?: string
  proveedor?: string
  categoria?: string
  estado: "en_stock" | "vendido" | "apartado"
  clienteNombre?: string
  fechaVenta?: Timestamp
  notas?: string
  creadoEn: Timestamp
  actualizadoEn: Timestamp
}

export type EstadoArticulo = "en_stock" | "vendido" | "apartado"

export type MetodoPago = "pago_movil" | "efectivo_usd" | "dolares_digitales"
export type EstatusPagoVenta = "por_pagar" | "pagado"
export type EstatusEntrega = "por_entregar" | "entregado"

export interface Venta {
  id: string
  articuloId?: string
  articuloNombre: string
  articuloCodigo?: string
  cantidad: number
  precioVenta: number
  clienteId?: string
  clienteNombre: string
  clienteWhatsapp?: string
  metodoPago?: MetodoPago
  fechaPago?: Timestamp
  estatusPago?: EstatusPagoVenta
  estatusEntrega: EstatusEntrega
  creadoEn: Timestamp
  actualizadoEn: Timestamp
}
