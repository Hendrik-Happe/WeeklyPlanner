import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } })
  if (existing) {
    console.log("ℹ️  Admin-Nutzer existiert bereits – Seed übersprungen.")
    return
  }

  const pinHash = await bcrypt.hash("1234", 12)
  await prisma.user.create({
    data: { username: "admin", pinHash, role: "ADMIN" },
  })

  console.log("")
  console.log("✅ Admin-Nutzer erstellt:")
  console.log("   Benutzername : admin")
  console.log("   PIN          : 1234")
  console.log("")
  console.log("   ⚠️  Bitte PIN nach dem ersten Login im Admin-Bereich ändern!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
