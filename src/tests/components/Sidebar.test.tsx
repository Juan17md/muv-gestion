import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Sidebar } from "@/components/Sidebar"
import { auth } from "@/lib/firebase"

const mockPush = vi.fn()
const mockPathname = vi.fn(() => "/dashboard")

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mockPathname(),
}))

describe("Sidebar", () => {
  it("muestra todas las secciones de navegacion", () => {
    render(<Sidebar />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getAllByText("Panel").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Pedidos")).toBeInTheDocument()
    expect(screen.getAllByText("Historial").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Inventario")).toBeInTheDocument()
    expect(screen.getByText("Clientes")).toBeInTheDocument()
    expect(screen.getByText("Tiendas")).toBeInTheDocument()
  })

  it("marca como activo el enlace de la ruta actual", () => {
    render(<Sidebar />)
    const enlace = screen.getByRole("link", { name: /dashboard/i })
    expect(enlace.className).toContain("bg-primary")
  })

  it("cierra sesion y redirige al login", async () => {
    const signOutMock = vi.spyOn(auth, "signOut").mockResolvedValue()
    render(<Sidebar />)
    const botonSalir = screen.getByRole("button", { name: /cerrar sesión|salir|logout/i })
    botonSalir.click()
    await vi.waitFor(() => expect(signOutMock).toHaveBeenCalled())
    expect(mockPush).toHaveBeenCalledWith("/login")
  })
})
