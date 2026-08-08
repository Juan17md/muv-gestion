import { Suspense } from "react"
import { render, act } from "@testing-library/react"

export function promesaResuelta<T>(value: T): Promise<T> {
  const p = Promise.resolve(value)
  ;(p as unknown as { status: string }).status = "fulfilled"
  ;(p as unknown as { value: T }).value = value
  return p
}

export function renderConSuspense(ui: React.ReactElement) {
  return render(<Suspense fallback={<div>cargando...</div>}>{ui}</Suspense>)
}

export async function flushPromesas() {
  await act(async () => {})
}
