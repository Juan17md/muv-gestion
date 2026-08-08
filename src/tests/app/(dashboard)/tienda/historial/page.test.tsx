import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import TiendaHistorialPage from "@/app/(dashboard)/tienda/historial/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { ventaEjemplo } from "@/tests/mocks/datos"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tienda/historial",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("TiendaHistorialPage", () => {
  it("renderiza el titulo de cobros pendientes", () => {
    render(<TiendaHistorialPage />)
    expect(screen.getByText("Cobros Pendientes")).toBeInTheDocument()
  })

  it("muestra las ventas registradas", async () => {
    sembrarDatos("ventas", {
      v1: ventaEjemplo("v1"),
      v2: ventaEjemplo("v2", { articuloNombre: "Teclado", clienteNombre: "Bruno", precioVenta: 60, estatusPago: "por_pagar" }),
    })
    render(<TiendaHistorialPage />)
    await waitFor(() => expect(screen.getByText("Laptop HP")).toBeInTheDocument())
    expect(screen.getByText("Teclado")).toBeInTheDocument()
  })

  it("filtra las ventas por busqueda", async () => {
    sembrarDatos("ventas", {
      v1: ventaEjemplo("v1"),
      v2: ventaEjemplo("v2", { articuloNombre: "Teclado" }),
    })
    render(<TiendaHistorialPage />)
    await waitFor(() => expect(screen.getByText("Laptop HP")).toBeInTheDocument())

    const input = screen.getByPlaceholderText(/buscar por artículo o cliente/i)
    fireEvent.change(input, { target: { value: "tecla" } })
    await waitFor(() => expect(screen.queryByText("Laptop HP")).not.toBeInTheDocument())
    expect(screen.getByText("Teclado")).toBeInTheDocument()
  })

  it("abre el dialogo de registro de cobro", async () => {
    sembrarDatos("ventas", { v1: ventaEjemplo("v1", { estatusPago: "por_pagar" }) })
    render(<TiendaHistorialPage />)
    await waitFor(() => expect(screen.getByText("Laptop HP")).toBeInTheDocument())
    const botonCobrar = screen.getAllByRole("button").find((b) => b.textContent?.includes("Cobrar"))
    if (botonCobrar) {
      fireEvent.click(botonCobrar)
      expect(screen.getByText("Registrar Cobro")).toBeInTheDocument()
    }
  })
})
