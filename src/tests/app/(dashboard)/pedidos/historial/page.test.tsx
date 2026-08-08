import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import HistorialPedidosPage from "@/app/(dashboard)/pedidos/historial/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { pedidoEjemplo } from "@/tests/mocks/datos"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/pedidos/historial",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("HistorialPedidosPage", () => {
  it("renderiza el titulo del historial", () => {
    render(<HistorialPedidosPage />)
    expect(screen.getByText("Historial de Pedidos")).toBeInTheDocument()
  })

  it("muestra los pedidos del historial con sus datos", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { estado: "entregado_cliente" }),
      p2: pedidoEjemplo("p2", { estado: "cerrado", tiendaNombre: "Shein", numeroGuia: "G-2002" }),
    })
    render(<HistorialPedidosPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())
    expect(screen.getByText("Shein")).toBeInTheDocument()
    expect(screen.getByText("G-1001")).toBeInTheDocument()
    expect(screen.getByText("G-2002")).toBeInTheDocument()
  })

  it("filtra por busqueda de tienda", async () => {
    sembrarDatos("pedidos", {
      p1: pedidoEjemplo("p1", { estado: "entregado_cliente" }),
      p2: pedidoEjemplo("p2", { estado: "cerrado", tiendaNombre: "Shein" }),
    })
    render(<HistorialPedidosPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())

    const input = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(input, { target: { value: "shei" } })
    await waitFor(() => expect(screen.queryByText("AliExpress")).not.toBeInTheDocument())
    expect(screen.getByText("Shein")).toBeInTheDocument()
  })
})
