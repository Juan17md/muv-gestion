import { describe, it, expect } from "vitest"
import { DIAS_ESTANCAMIENTO } from "@/lib/constants"

describe("constants", () => {
  it("define DIAS_ESTANCAMIENTO en 7 dias", () => {
    expect(DIAS_ESTANCAMIENTO).toBe(7)
  })
})
