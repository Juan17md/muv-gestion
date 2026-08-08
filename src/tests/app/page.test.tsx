import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import RootPage from "@/app/page"
import { redirect } from "next/navigation"
import type { ReactElement } from "react"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
}))

describe("RootPage", () => {
  it("redirige al login", () => {
    try {
      render(RootPage() as unknown as ReactElement)
    } catch {
      // el error de redirect se captura para evitar romper el test
    }
    expect(redirect).toHaveBeenCalledWith("/login")
  })
})
