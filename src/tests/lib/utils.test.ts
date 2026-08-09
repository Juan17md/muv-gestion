import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  cn,
  formatearMoneda,
  formatearFecha,
  calcularDiasEstancado,
  ESTADOS_PEDIDO,
  ESTADOS_PAGO,
  ESTADOS_ARTICULO,
  METODOS_PAGO,
  ESTATUS_PAGO_VENTA,
  ESTATUS_ENTREGA,
  SIGUIENTE_ESTADO,
  obtenerPrecioConDescuento,
  obtenerSubtotalArticulo,
  obtenerTotalArticulos,
  obtenerArticulosVenta,
  obtenerTotalVenta,
} from "@/lib/utils"
import type { ArticuloVenta, Venta } from "@/lib/types"

describe("utils", () => {
  describe("cn", () => {
    it("combina clases simples", () => {
      expect(cn("a", "b")).toBe("a b")
    })

    it("ignora valores falsy", () => {
      expect(cn("a", false, null, undefined, "b")).toBe("a b")
    })

    it("combina clases condicionales y resuelve conflictos de tailwind-merge", () => {
      expect(cn("px-2", "px-4")).toBe("px-4")
    })
  })

  describe("formatearMoneda", () => {
    it("formatea un monto entero en USD", () => {
      expect(formatearMoneda(100)).toBe("$100.00")
    })

    it("formatea un monto con decimales", () => {
      expect(formatearMoneda(1234.5)).toBe("$1,234.50")
    })

    it("formatea cero", () => {
      expect(formatearMoneda(0)).toBe("$0.00")
    })

    it("formatea montos negativos", () => {
      expect(formatearMoneda(-25.99)).toBe("-$25.99")
    })
  })

  describe("formatearFecha", () => {
    it("devuelve guion cuando no hay timestamp", () => {
      expect(formatearFecha(null)).toBe("-")
      expect(formatearFecha(undefined)).toBe("-")
    })

    it("formatea un timestamp de Firestore", () => {
      const fecha = formatearFecha({ seconds: 1700000000 })
      expect(fecha).toMatch(/\d{2} \w+ \d{4}/)
    })

    it("formatea un objeto Date", () => {
      const fecha = formatearFecha(new Date(2024, 0, 15))
      expect(fecha).toContain("2024")
    })
  })

  describe("calcularDiasEstancado", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2024, 0, 22))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("calcula 0 dias para una fecha reciente", () => {
      const hoy = new Date(2024, 0, 22)
      expect(calcularDiasEstancado(hoy)).toBe(0)
    })

    it("calcula 7 dias para una fecha hace una semana", () => {
      const haceUnaSemana = new Date(2024, 0, 15)
      expect(calcularDiasEstancado(haceUnaSemana)).toBe(7)
    })

    it("calcula dias a partir de un timestamp de Firestore", () => {
      const hace3Dias = new Date(2024, 0, 19)
      expect(calcularDiasEstancado({ seconds: Math.floor(hace3Dias.getTime() / 1000) })).toBe(3)
    })

    it("devuelve un numero negativo para fechas futuras (sin clamp)", () => {
      const futuro = new Date(2024, 0, 25)
      expect(calcularDiasEstancado(futuro)).toBeLessThan(0)
    })
  })

  describe("constantes de estado", () => {
    it("define los 8 estados de pedido", () => {
      expect(ESTADOS_PEDIDO).toHaveLength(8)
      const valores = ESTADOS_PEDIDO.map((e) => e.valor)
      expect(valores).toContain("borrador")
      expect(valores).toContain("entregado_cliente")
      expect(valores).toContain("cerrado")
      expect(valores).toContain("transito_china_usa")
    })

    it("cada estado de pedido tiene etiqueta y color", () => {
      for (const estado of ESTADOS_PEDIDO) {
        expect(estado.etiqueta).toBeTruthy()
        expect(estado.color).toBeTruthy()
      }
    })

    it("define estados de pago", () => {
      expect(ESTADOS_PAGO.map((e) => e.valor)).toEqual(["sin_pagar", "parcial", "pagado"])
    })

    it("define estados de articulo", () => {
      expect(ESTADOS_ARTICULO.map((e) => e.valor)).toEqual(["en_stock", "vendido", "apartado"])
    })

    it("define metodos de pago", () => {
      expect(METODOS_PAGO).toHaveLength(3)
      expect(METODOS_PAGO[0].valor).toBe("pago_movil")
    })

    it("define estatus de pago de venta", () => {
      expect(ESTATUS_PAGO_VENTA.map((e) => e.valor)).toEqual(["por_pagar", "pagado"])
    })

    it("define estatus de entrega", () => {
      expect(ESTATUS_ENTREGA.map((e) => e.valor)).toEqual(["por_entregar", "entregado"])
    })
  })

  describe("SIGUIENTE_ESTADO", () => {
    it("define la secuencia completa de avance de estados", () => {
      expect(SIGUIENTE_ESTADO.borrador).toBe("comprado")
      expect(SIGUIENTE_ESTADO.comprado).toBe("transito_china_usa")
      expect(SIGUIENTE_ESTADO["transito_china_usa"]).toBe("casillero_usa")
      expect(SIGUIENTE_ESTADO.casillero_usa).toBe("transito_usa_ven")
      expect(SIGUIENTE_ESTADO["transito_usa_ven"]).toBe("entregado_ven")
      expect(SIGUIENTE_ESTADO.entregado_ven).toBe("entregado_cliente")
    })

    it("no define estado posterior para estados finales", () => {
      expect(SIGUIENTE_ESTADO.entregado_cliente).toBeUndefined()
      expect(SIGUIENTE_ESTADO.cerrado).toBeUndefined()
    })
  })

  describe("obtenerPrecioConDescuento", () => {
    it("devuelve precio original sin descuento", () => {
      expect(obtenerPrecioConDescuento({ precioVenta: 100 })).toBe(100)
    })

    it("aplica descuento porcentual", () => {
      expect(obtenerPrecioConDescuento({ precioVenta: 100, descuento: 10 })).toBe(90)
    })

    it("aplica descuento en monto fijo", () => {
      expect(obtenerPrecioConDescuento({ precioVenta: 100, descuentoMonto: 15 })).toBe(85)
    })

    it("aplica ambos descuentos", () => {
      expect(obtenerPrecioConDescuento({ precioVenta: 100, descuento: 10, descuentoMonto: 5 })).toBe(85)
    })

    it("limita descuento porcentual al 100%", () => {
      expect(obtenerPrecioConDescuento({ precioVenta: 100, descuento: 150 })).toBe(0)
    })

    it("no devuelve precio negativo", () => {
      expect(obtenerPrecioConDescuento({ precioVenta: 10, descuentoMonto: 20 })).toBe(0)
    })
  })

  describe("obtenerSubtotalArticulo", () => {
    it("multiplica precio con descuento por cantidad", () => {
      const art: ArticuloVenta = { articuloNombre: "X", cantidad: 3, precioVenta: 100 }
      expect(obtenerSubtotalArticulo(art)).toBe(300)
    })

    it("aplica descuento y multiplica por cantidad", () => {
      const art: ArticuloVenta = { articuloNombre: "X", cantidad: 2, precioVenta: 100, descuento: 10 }
      expect(obtenerSubtotalArticulo(art)).toBe(180)
    })

    it("cantidad cero da 0", () => {
      const art: ArticuloVenta = { articuloNombre: "X", cantidad: 0, precioVenta: 100 }
      expect(obtenerSubtotalArticulo(art)).toBe(0)
    })
  })

  describe("obtenerTotalArticulos", () => {
    it("suma subtotales de varios articulos", () => {
      const arts: ArticuloVenta[] = [
        { articuloNombre: "A", cantidad: 2, precioVenta: 100 },
        { articuloNombre: "B", cantidad: 1, precioVenta: 50 },
      ]
      expect(obtenerTotalArticulos(arts)).toBe(250)
    })

    it("array vacio da 0", () => {
      expect(obtenerTotalArticulos([])).toBe(0)
    })
  })

  describe("obtenerArticulosVenta", () => {
    const ventaConArticulos = { id: "v1", clienteNombre: "A", articulos: [{ articuloNombre: "Laptop", cantidad: 2, precioVenta: 100 }], estatusEntrega: "por_entregar", creadoEn: {} as never, actualizadoEn: {} as never } as Venta

    it("devuelve array de articulos cuando existe", () => {
      const result = obtenerArticulosVenta(ventaConArticulos)
      expect(result).toHaveLength(1)
      expect(result[0].articuloNombre).toBe("Laptop")
    })

    it("fallback de venta antigua sin articulos", () => {
      const ventaAntigua = {
        id: "v2",
        clienteNombre: "B",
        articuloNombre: "Mouse",
        cantidad: 1,
        precioVenta: 25,
        estatusEntrega: "por_entregar",
        creadoEn: {} as never,
        actualizadoEn: {} as never,
        articulos: undefined,
      } as unknown as Venta
      const result = obtenerArticulosVenta(ventaAntigua)
      expect(result).toHaveLength(1)
      expect(result[0].articuloNombre).toBe("Mouse")
      expect(result[0].cantidad).toBe(1)
    })

    it("articulos vacio usa fallback", () => {
      const venta = { ...ventaConArticulos, articulos: [], articuloNombre: "X", cantidad: 3, precioVenta: 10 }
      const result = obtenerArticulosVenta(venta as unknown as Venta)
      expect(result).toHaveLength(1)
      expect(result[0].articuloNombre).toBe("X")
    })

    it("sin datos devuelve array vacio", () => {
      const venta = { ...ventaConArticulos, articulos: [] as ArticuloVenta[], articuloNombre: undefined } as unknown as Venta
      const result = obtenerArticulosVenta(venta)
      expect(result).toEqual([])
    })
  })

  describe("obtenerTotalVenta", () => {
    it("suma subtotal de articulos", () => {
      const venta = {
        id: "v1",
        clienteNombre: "A",
        articulos: [{ articuloNombre: "Laptop", cantidad: 2, precioVenta: 100 }],
        estatusEntrega: "por_entregar",
        creadoEn: {} as never,
        actualizadoEn: {} as never,
      } as Venta
      expect(obtenerTotalVenta(venta)).toBe(200)
    })

    it("incluye costo de delivery", () => {
      const venta = {
        id: "v1",
        clienteNombre: "A",
        articulos: [{ articuloNombre: "Laptop", cantidad: 1, precioVenta: 100 }],
        costoDelivery: 10,
        estatusEntrega: "por_entregar",
        creadoEn: {} as never,
        actualizadoEn: {} as never,
      } as Venta
      expect(obtenerTotalVenta(venta)).toBe(110)
    })

    it("fallback de venta antigua con delivery", () => {
      const venta = {
        id: "v2",
        clienteNombre: "B",
        articuloNombre: "Mouse",
        cantidad: 2,
        precioVenta: 25,
        costoDelivery: 5,
        estatusEntrega: "por_entregar",
        creadoEn: {} as never,
        actualizadoEn: {} as never,
      } as unknown as Venta
      expect(obtenerTotalVenta(venta)).toBe(55)
    })
  })
})
