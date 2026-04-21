import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function getPinMinLength(): number {
  const raw = process.env.AUTH_PIN_MIN_LENGTH
  const parsed = raw ? Number(raw) : NaN
  if (!Number.isFinite(parsed) || parsed < 4) return 6
  return Math.floor(parsed)
}

function isPinNumericOnlyEnabled(): boolean {
  const raw = process.env.AUTH_PIN_NUMERIC_ONLY
  if (!raw) return true
  const normalized = raw.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false
  return true
}

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (existing) {
    console.log("ℹ️  Admin-Nutzer existiert bereits – Seed übersprungen.")
    return
  }

  const username = process.env.SEED_ADMIN_USERNAME?.trim()
  const pin = process.env.SEED_ADMIN_PIN?.trim()
  const pinMinLength = getPinMinLength()
  const numericOnly = isPinNumericOnlyEnabled()

  if (!username) {
    throw new Error("SEED_ADMIN_USERNAME fehlt. Bitte beim Setup einen Admin-Benutzernamen angeben.")
  }

  if (!pin || pin.length < pinMinLength) {
    throw new Error(`SEED_ADMIN_PIN fehlt oder ist zu kurz. Bitte mindestens ${pinMinLength} Zeichen angeben.`)
  }

  if (numericOnly && !/^\d+$/.test(pin)) {
    throw new Error("SEED_ADMIN_PIN muss nur aus Ziffern bestehen.")
  }

  const duplicate = await prisma.user.findUnique({ where: { username } })
  if (duplicate) {
    throw new Error(`Benutzername \"${username}\" existiert bereits. Bitte einen anderen Namen wählen.`)
  }

  const pinHash = await bcrypt.hash(pin, 12)
  await prisma.user.create({
    data: { username, pinHash, role: "ADMIN" },
  })

  console.log("")
  console.log("✅ Admin-Nutzer erstellt:")
  console.log(`   Benutzername : ${username}`)
  console.log("")
  console.log("   ⚠️  Bitte PIN sicher aufbewahren und nach dem ersten Login ggf. ändern!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
