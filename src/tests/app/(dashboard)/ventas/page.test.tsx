import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import VentasPage from "@/app/(dashboard)/ventas/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { ventaEjemplo, clienteEjemplo } from "@/tests/mocks/datos"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/ventas",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("VentasPage", () => {
  it("renderiza el historial de ventas", () => {
    render(<VentasPage />)
    expect(screen.getByText("Historial de Ventas")).toBeInTheDocument()
  })

  it("muestra las ventas registradas", async () => {
    sembrarDatos("ventas", {
      v1: ventaEjemplo("v1"),
      v2: ventaEjemplo("v2", { articuloNombre: "Mouse", clienteNombre: "Bruno" }),
    })
    sembrarDatos("clientes", { c1: clienteEjemplo("c1") })
    render(<VentasPage />)
    await waitFor(() => expect(screen.getByText("Laptop HP")).toBeInTheDocument())
    expect(screen.getByText("Mouse")).toBeInTheDocument()
  })

  it("filtra las ventas por busqueda", async () => {
    sembrarDatos("ventas", {
      v1: ventaEjemplo("v1"),
      v2: ventaEjemplo("v2", { articuloNombre: "Mouse" }),
    })
    render(<VentasPage />)
    await waitFor(() => expect(screen.getByText("Laptop HP")).toBeInTheDocument())

    const input = screen.getByPlaceholderText(/buscar/i)
    fireEvent.change(input, { target: { value: "mouse" } })
    await waitFor(() => expect(screen.queryByText("Laptop HP")).not.toBeInTheDocument())
    expect(screen.getByText("Mouse")).toBeInTheDocument()
  })
})
