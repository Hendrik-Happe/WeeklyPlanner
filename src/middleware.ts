import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

function isPublicPath(pathname: string): boolean {
  if (
    pathname === "/login" ||
    pathname === "/impressum" ||
    pathname === "/datenschutz" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/icon" ||
    pathname === "/icon-192" ||
    pathname === "/apple-icon" ||
    pathname === "/favicon.ico"
  ) {
    return true
  }

  if (pathname.startsWith("/api/auth/")) return true
  if (pathname.startsWith("/_next/static/")) return true
  if (pathname.startsWith("/_next/image")) return true
  if (/^\/workbox-.*\.js$/.test(pathname)) return true

  return false
}

export default auth((req) => {
  if (isPublicPath(req.nextUrl.pathname)) {
    return NextResponse.next()
  }

  if (req.nextUrl.pathname === "/") {
    const dayUrl = req.nextUrl.clone()
    dayUrl.pathname = "/day"
    dayUrl.search = ""
    return NextResponse.redirect(dayUrl)
  }

  if (!req.auth) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.search = ""
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|login|impressum|datenschutz|manifest\\.webmanifest|sw\\.js|workbox-.*\\.js|icon(?:-192)?|apple-icon).*)",
  ],
}
