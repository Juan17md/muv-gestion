import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BottomNav } from "@/components/BottomNav"

const mockPush = vi.fn()
const mockPathname = vi.fn(() => "/pedidos")

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mockPathname(),
}))

describe("BottomNav", () => {
  it("muestra los accesos principales de navegacion movil", () => {
    render(<BottomNav />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Pedidos")).toBeInTheDocument()
    expect(screen.getByText("Clientes")).toBeInTheDocument()
    expect(screen.getByText("Inventario")).toBeInTheDocument()
    expect(screen.getByText("Tiendas")).toBeInTheDocument()
  })

  it("marca como activo el enlace de la ruta actual", () => {
    render(<BottomNav />)
    const enlace = screen.getByRole("link", { name: /pedidos/i })
    expect(enlace.className).toContain("text-primary")
  })
})
