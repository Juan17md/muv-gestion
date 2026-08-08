import { sembrarDatos } from "./firestoreMock"

const segundos = (diasAtras: number) => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - diasAtras)
  return Math.floor(fecha.getTime() / 1000)
}

export const pedidoEjemplo = (id: string, extras: Record<string, unknown> = {}) => ({
  tiendaRef: "t1",
  tiendaNombre: "AliExpress",
  estado: "abierto",
  ubicacion: "China",
  numeroGuia: "G-1001",
  montoTotal: 250.5,
  fechaCreacion: { seconds: segundos(2), nanoseconds: 0 },
  actualizadoEn: { seconds: segundos(1), nanoseconds: 0 },
  ...extras,
})

export const productoEjemplo = (id: string, extras: Record<string, unknown> = {}) => ({
  nombre: "Samsung S24",
  cantidad: 1,
  precioUnitario: 500,
  precioVenta: 650,
  estadoPago: "pagado",
  clienteNombre: "Ana",
  clienteRef: "c1",
  creadoEn: { seconds: segundos(2), nanoseconds: 0 },
  ...extras,
})

export const ventaEjemplo = (id: string, extras: Record<string, unknown> = {}) => ({
  articuloNombre: "Laptop HP",
  cantidad: 1,
  precioVenta: 850,
  clienteNombre: "Ana",
  estatusEntrega: "por_entregar",
  estatusPago: "por_pagar",
  creadoEn: { seconds: segundos(1), nanoseconds: 0 },
  actualizadoEn: { seconds: segundos(1), nanoseconds: 0 },
  ...extras,
})

export const articuloEjemplo = (id: string, extras: Record<string, unknown> = {}) => ({
  nombre: "iPhone 15",
  cantidad: 5,
  precioVenta: 900,
  costo: 700,
  estado: "en_stock",
  creadoEn: { seconds: segundos(1), nanoseconds: 0 },
  actualizadoEn: { seconds: segundos(1), nanoseconds: 0 },
  ...extras,
})

export const clienteEjemplo = (id: string, extras: Record<string, unknown> = {}) => ({
  nombre: "Ana Pérez",
  whatsapp: "+58 412 111 2222",
  notas: "Cliente recurrente",
  creadoEn: { seconds: segundos(30), nanoseconds: 0 },
  actualizadoEn: { seconds: segundos(1), nanoseconds: 0 },
  ...extras,
})

export const tiendaEjemplo = (id: string, extras: Record<string, unknown> = {}) => ({
  nombre: "AliExpress",
  notas: "Envío directo",
  creadoEn: { seconds: segundos(30), nanoseconds: 0 },
  actualizadoEn: { seconds: segundos(1), nanoseconds: 0 },
  ...extras,
})

export function sembrarEscenarioBasico() {
  sembrarDatos("pedidos", { p1: pedidoEjemplo("p1"), p2: pedidoEjemplo("p2", { estado: "entregado_cliente" }) })
  sembrarDatos("pedidos/p1/productos", { pr1: productoEjemplo("pr1") })
  sembrarDatos("ventas", { v1: ventaEjemplo("v1") })
  sembrarDatos("inventario", { i1: articuloEjemplo("i1") })
  sembrarDatos("clientes", { c1: clienteEjemplo("c1") })
  sembrarDatos("tiendas", { t1: tiendaEjemplo("t1") })
}
