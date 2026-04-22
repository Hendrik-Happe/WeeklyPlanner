import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.search = ""
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|login|impressum|datenschutz).*)",
  ],
}
