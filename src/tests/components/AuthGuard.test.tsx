import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthGuard } from "@/components/AuthGuard"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import type { User } from "firebase/auth"

vi.mock("@/lib/constants", () => ({
  UID_AUTORIZADO: "uid-autorizado",
  DIAS_ESTANCAMIENTO: 7,
}))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
}))

const useAuthStateMock = vi.mocked(useAuthState)

const usuario = (uid: string): User => ({ uid, email: "a@b.com" } as unknown as User)

describe("AuthGuard", () => {
  it("muestra el spinner mientras carga la autenticacion", () => {
    useAuthStateMock.mockReturnValue([null, true, undefined])
    render(
      <AuthGuard>
        <div>Contenido privado</div>
      </AuthGuard>
    )
    expect(document.querySelector(".animate-spin")).toBeInTheDocument()
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument()
  })

  it("redirige a /login cuando no hay usuario", () => {
    useAuthStateMock.mockReturnValue([null, false, undefined])
    render(
      <AuthGuard>
        <div>Contenido privado</div>
      </AuthGuard>
    )
    expect(mockPush).toHaveBeenCalledWith("/login")
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument()
  })

  it("muestra el contenido cuando hay usuario autenticado", () => {
    useAuthStateMock.mockReturnValue([usuario("uid-1"), false, undefined])
    render(
      <AuthGuard>
        <div>Contenido privado</div>
      </AuthGuard>
    )
    expect(screen.getByText("Contenido privado")).toBeInTheDocument()
  })

  it("cierra sesion si el uid no esta autorizado", () => {
    const signOutMock = vi.spyOn(auth, "signOut").mockResolvedValue()
    useAuthStateMock.mockReturnValue([usuario("uid-no-autorizado"), false, undefined])
    render(
      <AuthGuard>
        <div>Contenido privado</div>
      </AuthGuard>
    )
    expect(signOutMock).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/login?error=no-autorizado")
  })
})
