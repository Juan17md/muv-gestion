import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import DetallePedidoPage from "@/app/(dashboard)/pedidos/[id]/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { pedidoEjemplo, productoEjemplo } from "@/tests/mocks/datos"
import { renderConSuspense, promesaResuelta } from "@/tests/helpers/renderConSuspense"

const mockPush = vi.fn()
const mockRouter = { push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/pedidos/p1",
}))

beforeEach(() => {
  limpiarDatos()
  mockPush.mockClear()
})

describe("DetallePedidoPage", () => {
  it("renderiza el detalle del pedido", async () => {
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1") })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getByText("Detalle del Pedido")).toBeInTheDocument())
    expect(screen.getByText("AliExpress")).toBeInTheDocument()
    expect(screen.getByText("G-1001")).toBeInTheDocument()
  })

  it("redirige a /pedidos si el pedido no existe", async () => {
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "inexistente" })} />)
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedidos"))
  })

  it("muestra los productos del pedido", async () => {
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1") })
    sembrarDatos("pedidos/p1/productos", { pr1: productoEjemplo("pr1") })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getAllByText("Productos").length).toBeGreaterThan(0))
    expect(screen.getByText("Samsung S24")).toBeInTheDocument()
  })

  it("muestra el resumen financiero del pedido", async () => {
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1", { montoTotal: 250.5 }) })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getByText("Resumen Financiero")).toBeInTheDocument())
  })
})
