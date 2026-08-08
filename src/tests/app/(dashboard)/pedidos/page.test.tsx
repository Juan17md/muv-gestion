import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import PedidosPage from "@/app/(dashboard)/pedidos/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { pedidoEjemplo } from "@/tests/mocks/datos"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/pedidos",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("PedidosPage", () => {
  it("renderiza el titulo y la tabla vacia", async () => {
    render(<PedidosPage />)
    expect(screen.getByText("Pedidos")).toBeInTheDocument()
  })

  it("muestra los pedidos cargados con sus datos", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { montoTotal: 250.5 }),
      p2: pedidoEjemplo("p2", { estado: "entregado_cliente", tiendaNombre: "Shein" }),
    })
    render(<PedidosPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())
    expect(screen.getByText("Shein")).toBeInTheDocument()
    expect(screen.getAllByText("$250.50").length).toBe(2)
  })

  it("filtra los pedidos por estado usando los botones de filtro", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { estado: "comprado" }),
      p2: pedidoEjemplo("p2", { estado: "entregado_cliente", tiendaNombre: "Shein" }),
    })
    render(<PedidosPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())

    screen.getByRole("button", { name: /abierto/i }).click()
    await waitFor(() => expect(screen.queryByText("Shein")).not.toBeInTheDocument())
    expect(screen.getByText("AliExpress")).toBeInTheDocument()
  })

  it("filtra los pedidos por busqueda de tienda", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1"),
      p2: pedidoEjemplo("p2", { tiendaNombre: "Shein" }),
    })
    render(<PedidosPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())

    const inputBusqueda = screen.getByPlaceholderText(/buscar por tienda/i)
    fireEvent.change(inputBusqueda, { target: { value: "shei" } })
    await waitFor(() => expect(screen.queryByText("AliExpress")).not.toBeInTheDocument())
    expect(screen.getByText("Shein")).toBeInTheDocument()
  })
})
