import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createHash } from "crypto"
import {
  authRateLimitKey,
  authRateLimitUnknownKey,
  clearAuthRateLimit,
  isAuthBlocked,
  isAuthRateLimitEnabled,
  shouldTrustProxyHeaders,
  registerAuthFailure,
} from "@/lib/auth-rate-limit"
import { isValidPasswordFormat } from "@/lib/security-config"
import { findUserIdByUsernameInsensitive, normalizeUsername } from "@/lib/username"

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

function getUserAgentFingerprint(request?: Request): string {
  const raw = request?.headers.get("user-agent")?.trim()
  if (!raw) return "unknown"
  return createHash("sha256").update(raw).digest("hex").slice(0, 16)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: shouldTrustProxyHeaders(),
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
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials, request) {
        const username = (credentials?.username as string | undefined)?.trim()
        const legacyPin = (credentials as Record<string, unknown> | undefined)?.pin as string | undefined
        const password = (credentials?.password as string | undefined) ?? legacyPin
        if (!username || !password) return null
        if (!isValidPasswordFormat(password)) return null

        const normalizedUsername = normalizeUsername(username)

        const rateLimitEnabled = isAuthRateLimitEnabled()
        const clientIp = getClientIp(request)
        const key = clientIp !== "unknown"
          ? authRateLimitKey(normalizedUsername, clientIp)
          : authRateLimitUnknownKey(normalizedUsername, getUserAgentFingerprint(request))
        if (rateLimitEnabled && await isAuthBlocked(key)) {
          return null
        }

        const userId = await findUserIdByUsernameInsensitive(username)
        if (!userId) {
          if (rateLimitEnabled) await registerAuthFailure(key)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            passwordHash: true,
            role: true,
            sessionVersion: true,
          },
        })
        if (!user) {
          if (rateLimitEnabled) await registerAuthFailure(key)
          return null
        }

        const valid = await bcrypt.compare(password, user.passwordHash)
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
