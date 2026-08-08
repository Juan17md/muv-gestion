import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor, fireEvent } from "@testing-library/react"
import DetalleClientePage from "@/app/(dashboard)/clientes/[id]/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { clienteEjemplo, pedidoEjemplo, productoEjemplo } from "@/tests/mocks/datos"
import { renderConSuspense, promesaResuelta } from "@/tests/helpers/renderConSuspense"
import { updateDoc } from "firebase/firestore"

const mockPush = vi.fn()
const mockRouter = { push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/clientes/c1",
}))

beforeEach(() => {
  limpiarDatos()
  mockPush.mockClear()
})

describe("DetalleClientePage", () => {
  it("muestra la informacion del cliente", async () => {
    sembrarDatos("clientes", { c1: clienteEjemplo("c1") })
    renderConSuspense(<DetalleClientePage params={promesaResuelta({ id: "c1" })} />)
    await waitFor(() => expect(screen.getByText("Ana Pérez")).toBeInTheDocument())
    expect(screen.getByText("+58 412 111 2222")).toBeInTheDocument()
  })

  it("redirige a /clientes si el cliente no existe", async () => {
    renderConSuspense(<DetalleClientePage params={promesaResuelta({ id: "nope" })} />)
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith("/clientes"))
  })

  it("muestra el historial de compras del cliente", async () => {
    sembrarDatos("clientes", { c1: clienteEjemplo("c1") })
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1") })
    sembrarDatos("pedidos/p1/productos", { pr1: productoEjemplo("pr1") })
    renderConSuspense(<DetalleClientePage params={promesaResuelta({ id: "c1" })} />)
    await waitFor(() => expect(screen.getByText("Historial de Compras")).toBeInTheDocument())
  })

  it("edita los datos del cliente", async () => {
    sembrarDatos("clientes", { c1: clienteEjemplo("c1") })
    renderConSuspense(<DetalleClientePage params={promesaResuelta({ id: "c1" })} />)
    await waitFor(() => expect(screen.getByText("Ana Pérez")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: /editar/i }))
    const inputNombre = screen.getByDisplayValue("Ana Pérez")
    fireEvent.change(inputNombre, { target: { value: "Ana Rojas" } })
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }))

    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalled())
    const args = vi.mocked(updateDoc).mock.calls[0]
    expect(args[0]).toMatchObject({ ruta: "clientes/c1" })
    expect((args[1] as unknown as Record<string, unknown>).nombre).toBe("Ana Rojas")
  })
})
