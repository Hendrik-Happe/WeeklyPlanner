import { prisma } from "@/lib/prisma"

export async function getShoppingItems() {
  return prisma.shoppingItem.findMany({
    where: { removedAt: null },
    include: { tags: true },
    orderBy: [{ createdAt: "asc" }],
  })
}

export async function getRemovedShoppingItems() {
  return prisma.shoppingItem.findMany({
    where: { NOT: { removedAt: null } },
    orderBy: [{ removedAt: "desc" }],
  })
}

export async function getShoppingSuggestions() {
  const [items, tagHistory] = await Promise.all([
    prisma.shoppingItem.findMany({
      select: { name: true, nameNormalized: true },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.shoppingTagHistory.findMany({
      orderBy: [{ createdAt: "desc" }],
    }),
  ])

  const nameMap = new Map<string, string>()
  for (const item of items) {
    if (!nameMap.has(item.nameNormalized)) {
      nameMap.set(item.nameNormalized, item.name)
    }
  }

  const tagsByItem: Record<string, string[]> = {}
  for (const entry of tagHistory) {
    if (!tagsByItem[entry.itemNameNormalized]) tagsByItem[entry.itemNameNormalized] = []
    if (!tagsByItem[entry.itemNameNormalized].includes(entry.value)) {
      tagsByItem[entry.itemNameNormalized].push(entry.value)
    }
  }

  return {
    names: Array.from(nameMap.values()),
    tagsByItem,
  }
}
