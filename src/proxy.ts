import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const session = request.cookies.get("__session")
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/login") {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
