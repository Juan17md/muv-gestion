import { Timestamp } from "firebase/firestore";

// ─── Estados del Pedido ───
export const ESTADOS_PEDIDO = [
  "borrador",
  "comprado",
  "transito_china_usa",
  "casillero_usa",
  "transito_usa_ven",
  "entregado_ven",
  "entregado_cliente",
  "cerrado",
] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  borrador: "Borrador",
  comprado: "Comprado",
  transito_china_usa: "En Tránsito China→USA",
  casillero_usa: "En Casillero USA",
  transito_usa_ven: "En Tránsito USA→VEN",
  entregado_ven: "Entregado en Venezuela",
  entregado_cliente: "Entregado al Cliente",
  cerrado: "Cerrado",
};

// ─── Ubicaciones del Envío ───
export const UBICACIONES = [
  "tienda",
  "china",
  "casillero_usa",
  "en_camino_ven",
  "venezuela",
  "entregado",
] as const;

export type Ubicacion = (typeof UBICACIONES)[number];

export const ETIQUETAS_UBICACION: Record<Ubicacion, string> = {
  tienda: "En Tienda",
  china: "En China",
  casillero_usa: "En Casillero USA",
  en_camino_ven: "En Camino a Venezuela",
  venezuela: "En Venezuela",
  entregado: "Entregado",
};

// ─── Estados de Pago ───
export const ESTADOS_PAGO = ["sin_pagar", "parcial", "pagado"] as const;

export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const ETIQUETAS_PAGO: Record<EstadoPago, string> = {
  sin_pagar: "Sin Pagar",
  parcial: "Parcial",
  pagado: "Pagado",
};

// ─── Interfaces del Modelo de Datos ───

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string;
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

export interface Tienda {
  id: string;
  nombre: string;
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

export interface Pedido {
  id: string;
  tiendaRef: string;
  tiendaNombre: string;
  estado: EstadoPedido;
  ubicacion: Ubicacion;
  costoEnvioTotal?: number;
  montoTotal?: number;
  gananciaTotal?: number;
  fechaCreacion: Timestamp;
  fechaCompra?: Timestamp;
  fechaCierre?: Timestamp;
  actualizadoEn: Timestamp;
}

export interface ProductoPedido {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  margen: number;
  envioCliente?: number;
  clienteRef?: string;
  clienteNombre: string;
  estadoPago: EstadoPago;
  montoPagado?: number;
  creadoEn: Timestamp;
}

// ─── Mapeos de Estado → Ubicación ───
export const ESTADO_A_UBICACION: Record<EstadoPedido, Ubicacion> = {
  borrador: "tienda",
  comprado: "tienda",
  transito_china_usa: "china",
  casillero_usa: "casillero_usa",
  transito_usa_ven: "en_camino_ven",
  entregado_ven: "venezuela",
  entregado_cliente: "entregado",
  cerrado: "entregado",
};

// ─── Transiciones Permitidas ───
export const TRANSICIONES_PERMITIDAS: Record<EstadoPedido, EstadoPedido | null> = {
  borrador: "comprado",
  comprado: "transito_china_usa",
  transito_china_usa: "casillero_usa",
  casillero_usa: "transito_usa_ven",
  transito_usa_ven: "entregado_ven",
  entregado_ven: "entregado_cliente",
  entregado_cliente: "cerrado",
  cerrado: null,
};
