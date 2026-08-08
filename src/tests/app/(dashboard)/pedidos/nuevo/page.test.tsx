import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import NuevoPedidoPage from "@/app/(dashboard)/pedidos/nuevo/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { tiendaEjemplo } from "@/tests/mocks/datos"
import { addDoc } from "firebase/firestore"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/pedidos/nuevo",
}))

beforeEach(() => {
  limpiarDatos()
  mockPush.mockClear()
})

describe("NuevoPedidoPage", () => {
  it("renderiza el formulario de creacion", () => {
    render(<NuevoPedidoPage />)
    expect(screen.getByText("Crear Pedido")).toBeInTheDocument()
    expect(screen.getByText("Tienda existente")).toBeInTheDocument()
    expect(screen.getByText("Fecha del pedido")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /crear pedido en borrador/i })).toBeInTheDocument()
  })

  it("crea un pedido con tienda existente", async () => {
    sembrarDatos("tiendas", { t1: tiendaEjemplo("t1") })
    render(<NuevoPedidoPage />)
    await waitFor(() => expect(screen.getByText("AliExpress")).toBeInTheDocument())

    fireEvent.click(screen.getByText("AliExpress"))
    fireEvent.click(screen.getByRole("button", { name: /crear pedido en borrador/i }))

    await vi.waitFor(() => expect(addDoc).toHaveBeenCalled())
    const args = vi.mocked(addDoc).mock.calls[0]
    const data = args[1] as Record<string, unknown>
    expect(data.tiendaNombre).toBe("AliExpress")
    expect(data.estado).toBe("borrador")
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedidos/mock-id-1"))
  })

  it("crea una tienda nueva cuando se escribe un nombre", async () => {
    render(<NuevoPedidoPage />)
    await waitFor(() => expect(screen.getByText(/no hay tiendas registradas/i)).toBeInTheDocument())

    const input = screen.getByLabelText(/nombre de la tienda/i)
    fireEvent.change(input, { target: { value: "Temu" } })

    fireEvent.click(screen.getByRole("button", { name: /crear pedido en borrador/i }))
    await vi.waitFor(() => expect(addDoc).toHaveBeenCalled())
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalled())
  })

  it("muestra error si no hay tienda seleccionada ni nombre", async () => {
    render(<NuevoPedidoPage />)
    const boton = screen.getByRole("button", { name: /crear pedido en borrador/i })
    expect(boton).toBeDisabled()
  })
})
