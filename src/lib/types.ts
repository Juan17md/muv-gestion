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
  margen: number
  envioCliente?: number
  clienteRef?: string
  clienteNombre: string
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
  categoria?: string
  estado: "en_stock" | "vendido" | "apartado"
  clienteNombre?: string
  fechaVenta?: Timestamp
  notas?: string
  creadoEn: Timestamp
  actualizadoEn: Timestamp
}

export type EstadoArticulo = "en_stock" | "vendido" | "apartado"
