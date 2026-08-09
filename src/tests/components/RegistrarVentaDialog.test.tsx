import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RegistrarVentaDialog from "@/components/RegistrarVentaDialog"
import { sembrarDatos } from "../mocks/firestoreMock"
import { addDoc } from "firebase/firestore"
import { toast } from "sonner"
import type { ArticuloTienda } from "@/lib/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/tienda",
}))

const articulosEnStock: ArticuloTienda[] = [
  { id: "a1", nombre: "Laptop HP", cantidad: 3, precioVenta: 850, costo: 600, estado: "en_stock", creadoEn: { seconds: 1 } as never, actualizadoEn: { seconds: 1 } as never },
  { id: "a2", nombre: "Mouse", cantidad: 5, precioVenta: 25, costo: 10, estado: "en_stock", creadoEn: { seconds: 1 } as never, actualizadoEn: { seconds: 1 } as never },
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

  it("permite registrar una venta con un articulo", async () => {
    const user = userEvent.setup()
    sembrarDatos("clientes", {
      c1: { nombre: "Ana", whatsapp: "+58 111", creadoEn: { seconds: 1 }, actualizadoEn: { seconds: 1 } },
    })
    render(<RegistrarVentaDialog articulosEnStock={articulosEnStock} />)
    await user.click(screen.getByRole("button", { name: /registrar venta/i }))

    await user.click(screen.getByText("Seleccionar artículo..."))
    const opcion = screen.getByText("Laptop HP")
    await user.click(opcion)

    await user.click(screen.getByRole("button", { name: /agregar/i }))

    const inputCliente = screen.getByPlaceholderText("Nombre del cliente")
    await user.type(inputCliente, "Ana Pérez")

    await user.click(screen.getByText("Seleccionar método..."))
    await user.click(await screen.findByText("Efectivo $"))

    const botonesConfirmar = screen.getAllByText("Registrar venta")
    const botonConfirmar = botonesConfirmar[botonesConfirmar.length - 1].closest("button")
    expect(botonConfirmar).not.toBeNull()
    expect(botonConfirmar).not.toBeDisabled()
    await user.click(botonConfirmar!)

    expect(toast.error).not.toHaveBeenCalled()
    await waitFor(() => expect(addDoc).toHaveBeenCalled())
    const calls = vi.mocked(addDoc).mock.calls
    const ventasCall = calls.find((c) => (c[0] as { ruta?: string }).ruta === "ventas")
    expect(ventasCall).toBeDefined()
    const data = ventasCall![1] as Record<string, unknown>
    expect(data.articulos).toBeDefined()
    const articulos = data.articulos as Array<Record<string, unknown>>
    expect(articulos[0].articuloNombre).toBe("Laptop HP")
    expect(data.clienteNombre).toBe("Ana Pérez")
  })

  it("permite agregar varios articulos al carrito", async () => {
    const user = userEvent.setup()
    render(<RegistrarVentaDialog articulosEnStock={articulosEnStock} />)
    await user.click(screen.getByRole("button", { name: /registrar venta/i }))

    await user.click(screen.getByText("Seleccionar artículo..."))
    await user.click(screen.getByText("Laptop HP"))
    await user.click(screen.getByRole("button", { name: /agregar/i }))

    const comboboxBtn = screen.getAllByRole("combobox")[0]
    await user.click(comboboxBtn)
    await user.click(screen.getByText("Mouse"))
    await user.click(screen.getByRole("button", { name: /agregar/i }))

    expect(screen.getByText("Mouse")).toBeInTheDocument()
    expect(screen.getByText("Laptop HP")).toBeInTheDocument()
  })

  it("no registra la venta si el carrito esta vacio o falta cliente", async () => {
    const user = userEvent.setup()
    render(<RegistrarVentaDialog articulosEnStock={articulosEnStock} />)
    await user.click(screen.getByRole("button", { name: /registrar venta/i }))
    const botonesConfirmar = screen.getAllByText("Registrar venta")
    const botonConfirmar = botonesConfirmar[botonesConfirmar.length - 1].closest("button")
    expect(botonConfirmar).toBeDisabled()
  })
})
