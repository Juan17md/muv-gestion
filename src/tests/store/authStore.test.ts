import { describe, it, expect, beforeEach } from "vitest"
import { useAuthStore } from "@/store/authStore"
import type { User } from "firebase/auth"

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: true })
  })

  it("inicia sin usuario y en estado de carga", () => {
    const estado = useAuthStore.getState()
    expect(estado.user).toBeNull()
    expect(estado.loading).toBe(true)
  })

  it("setUser almacena el usuario autenticado", () => {
    const user = { uid: "uid-123", email: "test@muv.com" } as User
    useAuthStore.getState().setUser(user)
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().loading).toBe(true)
  })

  it("setUser con null limpia el usuario", () => {
    const user = { uid: "uid-123", email: "test@muv.com" } as User
    useAuthStore.getState().setUser(user)
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("setLoading actualiza el estado de carga", () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().loading).toBe(false)
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().loading).toBe(true)
  })

  it("no modifica el usuario al cambiar loading", () => {
    const user = { uid: "uid-1" } as User
    useAuthStore.setState({ user })
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().user).toEqual(user)
  })
})
