import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DetallePedidoPage from "@/app/(dashboard)/pedidos/[id]/page"
import { sembrarDatos, limpiarDatos } from "@/tests/mocks/firestoreMock"
import { pedidoEjemplo, productoEjemplo, clienteEjemplo } from "@/tests/mocks/datos"
import { renderConSuspense, promesaResuelta } from "@/tests/helpers/renderConSuspense"
import { addDoc } from "firebase/firestore"

const mockPush = vi.fn()
const mockRouter = { push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/pedidos/p1",
}))

beforeEach(() => {
  limpiarDatos()
  mockPush.mockClear()
})

describe("DetallePedidoPage", () => {
  it("renderiza el detalle del pedido", async () => {
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1") })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getByText("Detalle del Pedido")).toBeInTheDocument())
    expect(screen.getByText("AliExpress")).toBeInTheDocument()
    expect(screen.getByText("G-1001")).toBeInTheDocument()
  })

  it("redirige a /pedidos si el pedido no existe", async () => {
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "inexistente" })} />)
    await vi.waitFor(() => expect(mockPush).toHaveBeenCalledWith("/pedidos"))
  })

  it("muestra los productos del pedido", async () => {
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1") })
    sembrarDatos("pedidos/p1/productos", { pr1: productoEjemplo("pr1") })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getAllByText("Productos").length).toBeGreaterThan(0))
    expect(screen.getByText("Samsung S24")).toBeInTheDocument()
  })

  it("muestra el resumen financiero del pedido", async () => {
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1", { montoTotal: 250.5 }) })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getByText("Resumen Financiero")).toBeInTheDocument())
  })

  it("permite agregar varios productos al carrito y guardarlos de una vez", async () => {
    const user = userEvent.setup({ delay: null })
    sembrarDatos("pedidos", { p1: pedidoEjemplo("p1", { estado: "borrador" }) })
    sembrarDatos("clientes", { c1: clienteEjemplo("c1") })
    renderConSuspense(<DetallePedidoPage params={promesaResuelta({ id: "p1" })} />)
    await waitFor(() => expect(screen.getByRole("button", { name: /^agregar$/i })).toBeInTheDocument(), { timeout: 3000 })
    await user.click(screen.getByRole("button", { name: /^agregar$/i }))

    await user.type(screen.getByPlaceholderText("Nombre del cliente"), "Bruno Gómez")
    await user.type(screen.getByPlaceholderText("Ej: 584121234567"), "584121234567")
    await user.type(screen.getByPlaceholderText("Ej: Funda para celular"), "Funda")

    const inputCantidad = screen.getAllByPlaceholderText("1")[0]
    await user.type(inputCantidad, "2")
    const inputPrecio = screen.getAllByPlaceholderText("0.00")[0]
    await user.type(inputPrecio, "5")

    await user.type(screen.getByPlaceholderText("Precio de venta"), "10")

    await user.click(screen.getByRole("button", { name: /agregar al pedido/i }))
    expect(screen.getByText("Funda")).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText("Ej: Funda para celular"), "Cable")
    const inputCantidad2 = screen.getAllByPlaceholderText("1")[0]
    await user.type(inputCantidad2, "3")
    const inputPrecio2 = screen.getAllByPlaceholderText("0.00")[0]
    await user.type(inputPrecio2, "2")
    await user.click(screen.getByRole("button", { name: /agregar al pedido/i }))
    expect(screen.getByText("Cable")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /guardar en el pedido \(\d+\)/i }))
    await waitFor(() => expect(addDoc).toHaveBeenCalled(), { timeout: 3000 })
    const calls = vi.mocked(addDoc).mock.calls
    const rutaProductos = calls.filter((c) => (c[0] as { ruta?: string }).ruta === "pedidos/p1/productos")
    expect(rutaProductos.length).toBe(2)
    const primerProducto = rutaProductos[0][1] as Record<string, unknown>
    expect(primerProducto.clienteNombre).toBe("Bruno Gómez")
    expect(primerProducto.clienteWhatsapp).toBe("584121234567")
  })
})
