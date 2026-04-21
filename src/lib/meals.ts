import { prisma } from "@/lib/prisma"

export async function getRecipes() {
  return prisma.recipe.findMany({
    include: {
      createdBy: { select: { id: true, username: true } },
    },
    orderBy: [{ title: "asc" }],
  })
}

export async function getMealPlanForDate(date: string) {
  return prisma.mealPlan.findUnique({
    where: { date },
    include: {
      recipe: {
        include: {
          createdBy: { select: { id: true, username: true } },
        },
      },
      assignedBy: { select: { id: true, username: true } },
    },
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
  })

  return new Map(entries.map((entry) => [entry.date, entry]))
}
