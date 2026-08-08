import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import InventarioPage from "@/app/(dashboard)/inventario/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { articuloEjemplo } from "@/tests/mocks/datos"
import { addDoc, deleteDoc } from "firebase/firestore"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/inventario",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("InventarioPage", () => {
  it("renderiza el titulo de inventario", () => {
    render(<InventarioPage />)
    expect(screen.getByText("Inventario")).toBeInTheDocument()
  })

  it("muestra los articulos en stock", async () => {
    sembrarDatos("inventario", {
      i1: articuloEjemplo("i1"),
      i2: articuloEjemplo("i2", { nombre: "AirPods Pro", precioVenta: 250, costo: 180 }),
    })
    render(<InventarioPage />)
    await waitFor(() => expect(screen.getByText("iPhone 15")).toBeInTheDocument())
    expect(screen.getByText("AirPods Pro")).toBeInTheDocument()
  })

  it("abre el dialogo de nuevo articulo", () => {
    render(<InventarioPage />)
    fireEvent.click(screen.getByRole("button", { name: /^artículo$/i }))
    expect(screen.getByText("Nuevo Artículo")).toBeInTheDocument()
  })

  it("crea un articulo nuevo", async () => {
    render(<InventarioPage />)
    fireEvent.click(screen.getByRole("button", { name: /^artículo$/i }))
    const inputNombre = screen.getByPlaceholderText(/funda iphone/i)
    const inputPrecioVenta = screen.getAllByPlaceholderText("0.00")[1]
    fireEvent.change(inputNombre, { target: { value: "Teclado Mecánico" } })
    fireEvent.change(inputPrecioVenta, { target: { value: "120" } })
    fireEvent.click(screen.getByRole("button", { name: /agregar al inventario/i }))
    await vi.waitFor(() => expect(addDoc).toHaveBeenCalled())
    const args = vi.mocked(addDoc).mock.calls[0]
    expect((args[1] as Record<string, unknown>).nombre).toBe("Teclado Mecánico")
  })

  it("elimina un articulo con confirmacion", async () => {
    const usuario = userEvent.setup()
    sembrarDatos("inventario", { i1: articuloEjemplo("i1") })
    render(<InventarioPage />)
    await waitFor(() => expect(screen.getByText("iPhone 15")).toBeInTheDocument())
    await usuario.click(screen.getAllByRole("button").at(-1)!)
    expect(deleteDoc).not.toHaveBeenCalled()
    await usuario.click(screen.getByText("Eliminar"))
    await vi.waitFor(() => expect(deleteDoc).toHaveBeenCalled())
  })
})
