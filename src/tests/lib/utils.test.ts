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
} from "@/lib/utils"

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
})
