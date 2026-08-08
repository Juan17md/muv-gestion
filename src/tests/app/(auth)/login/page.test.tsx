import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LoginPage from "@/app/(auth)/login/page"
import { signInWithEmailAndPassword } from "firebase/auth"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/login",
}))

const signInMock = vi.mocked(signInWithEmailAndPassword)

describe("LoginPage", () => {
  it("renderiza el formulario de inicio de sesion", () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it("muestra error si los campos estan vacios", async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))
    expect(signInMock).not.toHaveBeenCalled()
  })

  it("inicia sesion y navega al dashboard", async () => {
    signInMock.mockResolvedValueOnce({ user: { uid: "u1" } } as never)
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/correo electrónico/i), "admin@muv.com")
    await user.type(screen.getByLabelText(/contraseña/i), "secreta123")
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))
    await vi.waitFor(() => expect(signInMock).toHaveBeenCalledWith(expect.anything(), "admin@muv.com", "secreta123"))
    expect(mockPush).toHaveBeenCalledWith("/dashboard")
  })

  it("muestra error cuando las credenciales son incorrectas", async () => {
    signInMock.mockRejectedValueOnce(new Error("auth/invalid-credential"))
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText(/correo electrónico/i), "admin@muv.com")
    await user.type(screen.getByLabelText(/contraseña/i), "incorrecta")
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }))
    await vi.waitFor(() => expect(mockPush).not.toHaveBeenCalled())
  })
})
