import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RegistrarVentaDialog from "@/components/RegistrarVentaDialog"
import { sembrarDatos } from "../mocks/firestoreMock"
import { addDoc } from "firebase/firestore"
import type { ArticuloTienda } from "@/lib/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tienda",
}))

const articulosEnStock: ArticuloTienda[] = [
  { id: "a1", nombre: "Laptop HP", cantidad: 3, precioVenta: 850, costo: 600, estado: "en_stock", creadoEn: { seconds: 1 } as never, actualizadoEn: { seconds: 1 } as never },
]

describe("RegistrarVentaDialog", () => {
  it("abre el dialogo de registro de venta", async () => {
    const user = userEvent.setup()
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", creadoEn: { seconds: 1 }, actualizadoEn: { seconds: 1 } },
    })
    render(<RegistrarVentaDialog articulosEnStock={articulosEnStock} />)
    await user.click(screen.getByRole("button", { name: /registrar venta/i }))
    expect(screen.getByText("Registrar Venta")).toBeInTheDocument()
  })

  it("permite registrar una venta completa", async () => {
    const user = userEvent.setup()
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", creadoEn: { seconds: 1 }, actualizadoEn: { seconds: 1 } },
    })
    render(<RegistrarVentaDialog articulosEnStock={articulosEnStock} />)
    await user.click(screen.getByRole("button", { name: /registrar venta/i }))

    await user.click(screen.getByText("Seleccionar artículo..."))
    const opcion = screen.getByText("Laptop HP")
    await user.click(opcion)

    const inputCliente = screen.getByPlaceholderText("Nombre del cliente")
    await user.type(inputCliente, "Ana Pérez")

    await user.click(screen.getByText("Seleccionar método..."))
    await user.click(await screen.findByText("Efectivo $"))

    await user.click(screen.getByRole("button", { name: "Registrar venta" }))

    await waitFor(() => expect(addDoc).toHaveBeenCalled())
    const args = vi.mocked(addDoc).mock.calls[0]
    const data = args[1] as Record<string, unknown>
    expect(data.articuloNombre).toBe("Laptop HP")
    expect(data.clienteNombre).toBe("Ana Pérez")
  })

  it("no registra la venta si faltan campos obligatorios", async () => {
    const user = userEvent.setup()
    render(<RegistrarVentaDialog articulosEnStock={articulosEnStock} />)
    await user.click(screen.getByRole("button", { name: /registrar venta/i }))
    const botonesConfirmar = screen.getAllByText("Registrar venta")
    const botonConfirmar = botonesConfirmar[botonesConfirmar.length - 1].closest("button")
    expect(botonConfirmar).toBeDisabled()
  })
})
