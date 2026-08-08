import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import DashboardGlobalPage from "@/app/(dashboard)/dashboard/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { pedidoEjemplo, ventaEjemplo, articuloEjemplo, productoEjemplo } from "@/tests/mocks/datos"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("DashboardGlobalPage", () => {
  it("renderiza el titulo del dashboard sin datos", async () => {
    render(<DashboardGlobalPage />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })

  it("muestra las estadisticas y pedidos recientes con datos", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { montoTotal: 500 }),
      p2: pedidoEjemplo("p2", { estado: "entregado_cliente", montoTotal: 300 }),
    })
    sembrarDatos("pedidos/p1/productos", { pr1: productoEjemplo("pr1") })
    sembrarDatos("ventas", { v1: ventaEjemplo("v1", { precioVenta: 850 }) })
    sembrarDatos("inventario", { i1: articuloEjemplo("i1") })

    render(<DashboardGlobalPage />)

    await waitFor(() => expect(screen.getByText("Pedidos Recientes")).toBeInTheDocument())
    expect(screen.getAllByText("AliExpress").length).toBeGreaterThan(0)
    expect(screen.getByText("Últimas Ventas")).toBeInTheDocument()
    expect(screen.getByText("Últimos Artículos")).toBeInTheDocument()
  })

  it("muestra la alerta de pedidos estancados", async () => {
    const hace8Dias = new Date()
    hace8Dias.setDate(hace8Dias.getDate() - 8)
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { estado: "comprado", actualizadoEn: { seconds: Math.floor(hace8Dias.getTime() / 1000), nanoseconds: 0 } }),
    })
    render(<DashboardGlobalPage />)
    await waitFor(() => expect(screen.getByText("Pedidos Estancados")).toBeInTheDocument())
  })
})
