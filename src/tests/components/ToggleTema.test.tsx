import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ToggleTema } from "@/components/ToggleTema"
import { useTheme } from "next-themes"

const useThemeMock = vi.mocked(useTheme)

describe("ToggleTema", () => {
  it("renderiza el boton de cambio de tema al montar", () => {
    useThemeMock.mockReturnValue({
      theme: "light",
      setTheme: vi.fn(),
      resolvedTheme: "light",
      themes: ["light", "dark"],
    })
    render(<ToggleTema />)
    expect(screen.getByRole("button", { name: /cambiar tema/i })).toBeInTheDocument()
  })

  it("alterna a oscuro cuando el tema es claro", () => {
    const setTheme = vi.fn()
    useThemeMock.mockReturnValue({
      theme: "light",
      setTheme,
      resolvedTheme: "light",
      themes: ["light", "dark"],
    })
    render(<ToggleTema />)
    const boton = screen.getByRole("button", { name: /cambiar tema/i })
    boton.click()
    expect(setTheme).toHaveBeenCalledWith("dark")
  })

  it("alterna a claro cuando el tema es oscuro", () => {
    const setTheme = vi.fn()
    useThemeMock.mockReturnValue({
      theme: "dark",
      setTheme,
      resolvedTheme: "dark",
      themes: ["light", "dark"],
    })
    render(<ToggleTema />)
    const boton = screen.getByRole("button", { name: /cambiar tema/i })
    boton.click()
    expect(setTheme).toHaveBeenCalledWith("light")
  })
})
