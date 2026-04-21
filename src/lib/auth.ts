import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import {
  authRateLimitKey,
  clearAuthRateLimit,
  isAuthBlocked,
  isAuthRateLimitEnabled,
  shouldTrustProxyHeaders,
  registerAuthFailure,
} from "@/lib/auth-rate-limit"
import { isValidPinFormat } from "@/lib/security-config"

const SESSION_MAX_AGE = 60 * 60 * 24 * 365
const SESSION_UPDATE_AGE = 60 * 60 * 24

function getClientIp(request?: Request): string {
  if (!request) return "unknown"

  if (!shouldTrustProxyHeaders()) {
    return "unknown"
  }

  const xForwardedFor = request.headers.get("x-forwarded-for")
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0]?.trim()
    if (firstIp) return firstIp
  }

  const xRealIp = request.headers.get("x-real-ip")?.trim()
  if (xRealIp) return xRealIp

  return "unknown"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  pages: { signIn: "/login" },
  logger: {
    error(error, ...message) {
      // Invalid credentials are expected user input and should not flood server logs.
      if (error instanceof Error && error.name === "CredentialsSignin") return
      console.error("[auth][error]", error, ...message)
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Benutzername" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials, request) {
        const username = (credentials?.username as string | undefined)?.trim()
        const pin = (credentials?.pin as string | undefined)?.trim()
        if (!username || !pin) return null
        if (!isValidPinFormat(pin)) return null

        const rateLimitEnabled = isAuthRateLimitEnabled()
        const key = authRateLimitKey(username, getClientIp(request))
        if (rateLimitEnabled && await isAuthBlocked(key)) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            pinHash: true,
            role: true,
            sessionVersion: true,
          },
        })
        if (!user) {
          if (rateLimitEnabled) await registerAuthFailure(key)
          return null
        }

        const valid = await bcrypt.compare(pin, user.pinHash)
        if (!valid) {
          if (rateLimitEnabled) await registerAuthFailure(key)
          return null
        }

        if (rateLimitEnabled) await clearAuthRateLimit(key)

        return {
          id: user.id,
          name: user.username,
          role: user.role,
          sessionVersion: user.sessionVersion,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.sessionVersion = (token.sessionVersion as number | undefined) ?? 0
      }
      return session
    },
  },
})

export async function getCurrentSession() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, sessionVersion: true },
  })

  if (!user) return null
  if ((session.user.sessionVersion ?? 0) !== user.sessionVersion) return null

  return {
    ...session,
    user: {
      ...session.user,
      id: user.id,
      name: user.username,
      role: user.role,
    },
  }
}
