import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Benutzername" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string
        const pin = credentials?.pin as string
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
