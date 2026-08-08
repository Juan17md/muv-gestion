import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import TiendasPage from "@/app/(dashboard)/tiendas/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { tiendaEjemplo } from "@/tests/mocks/datos"
import { addDoc, deleteDoc } from "firebase/firestore"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tiendas",
}))

beforeEach(() => {
  limpiarDatos()
})

describe("TiendasPage", () => {
  it("renderiza el titulo de tiendas", () => {
    render(<TiendasPage />)
    expect(screen.getByText("Tiendas")).toBeInTheDocument()
  })

  it("muestra las tiendas registradas", async () => {
    sembrarDatos("tiendas", {
      t1: tiendaEjemplo("t1"),
      t2: tiendaEjemplo("t2", { nombre: "Shein", notas: "Ropa" }),
    })
    render(<TiendasPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())
    expect(screen.getByText("Shein")).toBeInTheDocument()
  })

  it("abre el dialogo de nueva tienda", () => {
    render(<TiendasPage />)
    fireEvent.click(screen.getByRole("button", { name: /^nueva$/i }))
    expect(screen.getByText("Registrar Tienda")).toBeInTheDocument()
  })

  it("crea una tienda nueva", async () => {
    render(<TiendasPage />)
    fireEvent.click(screen.getByRole("button", { name: /^nueva$/i }))
    const inputNombre = screen.getByPlaceholderText("Nombre de la tienda")
    fireEvent.change(inputNombre, { target: { value: "Temu" } })
    fireEvent.click(screen.getByRole("button", { name: /guardar tienda/i }))
    await vi.waitFor(() => expect(addDoc).toHaveBeenCalled())
    const args = vi.mocked(addDoc).mock.calls[0]
    expect((args[1] as Record<string, unknown>).nombre).toBe("Temu")
  })

  it("elimina una tienda con confirmacion", async () => {
    const usuario = userEvent.setup()
    sembrarDatos("tiendas", { t1: tiendaEjemplo("t1") })
    render(<TiendasPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())
    await usuario.click(screen.getAllByRole("button").at(-1)!)
    expect(deleteDoc).not.toHaveBeenCalled()
    await usuario.click(screen.getByText("Eliminar"))
    await vi.waitFor(() => expect(deleteDoc).toHaveBeenCalled())
  })
})
