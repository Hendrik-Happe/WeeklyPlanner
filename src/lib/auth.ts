import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const SESSION_MAX_AGE = 60 * 60 * 24 * 365
const SESSION_UPDATE_AGE = 60 * 60 * 24

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
      async authorize(credentials) {
        const username = (credentials?.username as string | undefined)?.trim()
        const pin = (credentials?.pin as string | undefined)?.trim()
        if (!username || !pin) return null

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) return null

        const valid = await bcrypt.compare(pin, user.pinHash)
        if (!valid) return null

        return { id: user.id, name: user.username, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
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
    select: { id: true, username: true, role: true },
  })

  if (!user) return null

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
