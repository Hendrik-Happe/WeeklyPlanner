import { prisma } from "@/lib/prisma"

type UserIdRow = { id: string }

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export async function findUserIdByUsernameInsensitive(username: string): Promise<string | null> {
  const normalized = normalizeUsername(username)
  const rows = await prisma.$queryRaw<UserIdRow[]>`
    SELECT id
    FROM "User"
    WHERE lower(username) = ${normalized}
    LIMIT 1
  `

  return rows[0]?.id ?? null
}

export async function isUsernameTakenInsensitive(username: string): Promise<boolean> {
  const userId = await findUserIdByUsernameInsensitive(username)
  return Boolean(userId)
}