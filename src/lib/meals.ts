import { prisma } from "@/lib/prisma"

export async function getRecipes() {
  return prisma.recipe.findMany({
    include: {
      createdBy: { select: { id: true, username: true } },
    },
    orderBy: [{ title: "asc" }],
  })
}

export async function getMealPlansForDate(date: string) {
  return prisma.mealPlan.findMany({
    where: { date },
    include: {
      recipe: {
        include: {
          createdBy: { select: { id: true, username: true } },
        },
      },
      assignedBy: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "asc" },
  })
}

export async function getMealPlansForDates(dates: string[]) {
  const entries = await prisma.mealPlan.findMany({
    where: { date: { in: dates } },
    include: {
      recipe: {
        include: {
          createdBy: { select: { id: true, username: true } },
        },
      },
      assignedBy: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const map = new Map<string, typeof entries>()
  for (const entry of entries) {
    const existing = map.get(entry.date) ?? []
    existing.push(entry)
    map.set(entry.date, existing)
  }
  return map
}
