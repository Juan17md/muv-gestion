import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import ClientesPage from "@/app/(dashboard)/clientes/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { clienteEjemplo } from "@/tests/mocks/datos"
import { addDoc } from "firebase/firestore"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/clientes",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("ClientesPage", () => {
  it("renderiza el titulo de clientes", () => {
    render(<ClientesPage />)
    expect(screen.getByText("Clientes")).toBeInTheDocument()
  })

  it("muestra los clientes cargados", async () => {
    sembrarDatos("clientes", {
      c1: clienteEjemplo("c1"),
      c2: clienteEjemplo("c2", { nombre: "Bruno Díaz", whatsapp: "+58 424 555 6666" }),
    })
    render(<ClientesPage />)
    await waitFor(() => expect(screen.getByText("Ana Pérez")).toBeInTheDocument())
    expect(screen.getByText("Bruno Díaz")).toBeInTheDocument()
    expect(screen.getByText("+58 412 111 2222")).toBeInTheDocument()
  })

  it("abre el dialogo de nuevo cliente", () => {
    render(<ClientesPage />)
    fireEvent.click(screen.getByRole("button", { name: /nuevo/i }))
    expect(screen.getByText("Registrar Cliente")).toBeInTheDocument()
  })

  it("crea un cliente nuevo", async () => {
    render(<ClientesPage />)
    fireEvent.click(screen.getByRole("button", { name: /nuevo/i }))
    const inputNombre = screen.getByPlaceholderText("Nombre del cliente")
    const inputWhatsapp = screen.getByPlaceholderText(/58412/i)
    fireEvent.change(inputNombre, { target: { value: "Nuevo Cliente" } })
    fireEvent.change(inputWhatsapp, { target: { value: "584140001111" } })
    fireEvent.click(screen.getByRole("button", { name: /guardar cliente/i }))
    await vi.waitFor(() => expect(addDoc).toHaveBeenCalled())
    const args = vi.mocked(addDoc).mock.calls[0]
    expect((args[1] as Record<string, unknown>).nombre).toBe("Nuevo Cliente")
  })
})
