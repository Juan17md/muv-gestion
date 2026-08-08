import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import TiendaPage from "@/app/(dashboard)/tienda/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { ventaEjemplo, articuloEjemplo } from "@/tests/mocks/datos"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tienda",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("TiendaPage", () => {
  it("renderiza el panel de tienda", () => {
    render(<TiendaPage />)
    expect(screen.getByText("Panel de Tienda")).toBeInTheDocument()
  })

  it("muestra las ultimas ventas y articulos", async () => {
    sembrarDatos("ventas", { v1: ventaEjemplo("v1") })
    sembrarDatos("inventario", { i1: articuloEjemplo("i1") })
    render(<TiendaPage />)
    await waitFor(() => expect(screen.getByText("Últimas Ventas")).toBeInTheDocument())
    expect(screen.getByText("Laptop HP")).toBeInTheDocument()
    expect(screen.getByText("Artículos Recientes")).toBeInTheDocument()
    expect(screen.getByText("iPhone 15")).toBeInTheDocument()
  })

  it("ofrece registrar una venta", async () => {
    sembrarDatos("inventario", { i1: articuloEjemplo("i1") })
    render(<TiendaPage />)
    await waitFor(() => expect(screen.getByText("iPhone 15")).toBeInTheDocument())
    const botonRegistrar = screen.getAllByRole("button").find((b) => b.textContent?.includes("Registrar venta"))
    expect(botonRegistrar).toBeTruthy()
  })
})
