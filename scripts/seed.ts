import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function getPinMinLength(): number {
  const raw = process.env.AUTH_PASSWORD_MIN_LENGTH ?? process.env.AUTH_PIN_MIN_LENGTH
  const parsed = raw ? Number(raw) : NaN
  if (!Number.isFinite(parsed) || parsed < 4) return 6
  return Math.floor(parsed)
}

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (existing) {
    console.log("ℹ️  Admin-Nutzer existiert bereits – Seed übersprungen.")
    return
  }

  const username = process.env.SEED_ADMIN_USERNAME?.trim()
  const password = process.env.SEED_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PIN
  const passwordMinLength = getPinMinLength()

  if (!username) {
    throw new Error("SEED_ADMIN_USERNAME fehlt. Bitte beim Setup einen Admin-Benutzernamen angeben.")
  }

  if (!password || password.length < passwordMinLength) {
    throw new Error(`SEED_ADMIN_PASSWORD fehlt oder ist zu kurz. Bitte mindestens ${passwordMinLength} Zeichen angeben.`)
  }

  const duplicate = await prisma.user.findUnique({ where: { username } })
  if (duplicate) {
    throw new Error(`Benutzername \"${username}\" existiert bereits. Bitte einen anderen Namen wählen.`)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { username, passwordHash, role: "ADMIN" },
  })

  console.log("")
  console.log("✅ Admin-Nutzer erstellt:")
  console.log(`   Benutzername : ${username}`)
  console.log("")
  console.log("   ⚠️  Bitte Passwort sicher aufbewahren und nach dem ersten Login ggf. ändern!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
