import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import PanelPedidosPage from "@/app/(dashboard)/pedidos/panel/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { pedidoEjemplo } from "@/tests/mocks/datos"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/pedidos/panel",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("PanelPedidosPage", () => {
  it("renderiza el titulo del panel", () => {
    render(<PanelPedidosPage />)
    expect(screen.getByText("Panel de Pedidos")).toBeInTheDocument()
  })

  it("muestra las metricas con pedidos cargados", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { estado: "comprado", montoTotal: 500 }),
      p2: pedidoEjemplo("p2", { estado: "borrador", montoTotal: 200, tiendaNombre: "Shein" }),
    })
    render(<PanelPedidosPage />)
    await waitFor(() => expect(screen.getByText("Pedidos Recientes")).toBeInTheDocument())
    expect(screen.getByText("AliExpress")).toBeInTheDocument()
    expect(screen.getByText("Shein")).toBeInTheDocument()
  })

  it("muestra la alerta de pedidos estancados", async () => {
    const hace8Dias = new Date()
    hace8Dias.setDate(hace8Dias.getDate() - 8)
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { estado: "comprado", actualizadoEn: { seconds: Math.floor(hace8Dias.getTime() / 1000), nanoseconds: 0 } }),
    })
    render(<PanelPedidosPage />)
    await waitFor(() => expect(screen.getByText("Pedidos Estancados")).toBeInTheDocument())
  })
})
