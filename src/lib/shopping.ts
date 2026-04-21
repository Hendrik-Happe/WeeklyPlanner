import { prisma } from "@/lib/prisma"

const DEFAULT_LIST_NAME = "Meine Liste"

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

export async function getOrCreateDefaultShoppingList(userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: { createdById: userId },
    orderBy: { createdAt: "asc" },
  })

  if (existing) {
    await prisma.shoppingItem.updateMany({
      where: { createdById: userId, listId: null },
      data: { listId: existing.id },
    })
    return existing
  }

  const created = await prisma.shoppingList.create({
    data: {
      name: DEFAULT_LIST_NAME,
      nameNormalized: normalize(DEFAULT_LIST_NAME),
      createdById: userId,
    },
  })

  await prisma.shoppingItem.updateMany({
    where: { createdById: userId, listId: null },
    data: { listId: created.id },
  })

  return created
}

export async function getAccessibleShoppingLists(userId: string) {
  return prisma.shoppingList.findMany({
    where: {
      OR: [
        { createdById: userId },
        { isSharedWithAll: true },
        { members: { some: { userId } } },
      ],
    },
    include: {
      createdBy: { select: { username: true } },
      members: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  })
}

export async function getShoppingItems(listId: string) {
  return prisma.shoppingItem.findMany({
    where: { listId, removedAt: null },
    include: { tags: true },
    orderBy: [{ createdAt: "asc" }],
  })
}

export async function getRemovedShoppingItems(listId: string) {
  return prisma.shoppingItem.findMany({
    where: { listId, NOT: { removedAt: null } },
    include: { tags: true },
    orderBy: [{ removedAt: "desc" }],
  })
}

export async function getShoppingSuggestions(listId: string) {
  const [items, tagHistory] = await Promise.all([
    prisma.shoppingItem.findMany({
      where: { listId },
      select: { name: true, nameNormalized: true },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.shoppingTagHistory.findMany({
      where: { listId },
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
