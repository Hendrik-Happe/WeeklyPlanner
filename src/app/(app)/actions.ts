"use server"

import { getCurrentSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/tasks"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { getPinMinLength } from "@/lib/security-config"

async function requireSession() {
  const session = await getCurrentSession()
  if (!session) throw new Error("Nicht angemeldet")
  return session
}

const ALLOWED_USER_ROLES = new Set(["USER", "ADMIN"])
const ALLOWED_RECIPE_SOURCE_TYPES = new Set(["APP", "BOOK", "LINK"])

function parseRole(value: string): "USER" | "ADMIN" {
  if (!ALLOWED_USER_ROLES.has(value)) throw new Error("Ungültige Rolle")
  return value as "USER" | "ADMIN"
}

function sanitizeRecipeUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error("Ungültiger Link")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Ungültiger Link")
  }

  return parsed.toString()
}

async function getAuthorizedTask(
  userId: string,
  taskId: string,
  date?: string,
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { isPrivate: false },
        { createdById: userId },
        { assignedToId: userId },
        {
          assignments: {
            some: {
              userId,
              ...(date ? { date } : {}),
            },
          },
        },
      ],
    },
    include: {
      assignments: date ? { where: { date } } : true,
    },
  })

  if (!task) throw new Error("Aufgabe nicht gefunden oder keine Berechtigung")
  return task
}

export async function markDone(formData: FormData) {
  const session = await requireSession()

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string

  await getAuthorizedTask(session.user.id, taskId, date)

  await prisma.taskCompletion.upsert({
    where: { taskId_date: { taskId, date } },
    create: { taskId, userId: session.user.id, date, status: "DONE" },
    update: { status: "DONE", snoozedTo: null },
  })

  revalidatePath("/day")
  revalidatePath("/week")
  revalidatePath("/my-tasks")
}

export async function snoozeTask(formData: FormData) {
  const session = await requireSession()

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string

  await getAuthorizedTask(session.user.id, taskId, date)

  const d = new Date(date + "T00:00:00")
  d.setDate(d.getDate() + 1)
  const tomorrow = formatDate(d)

  // Nur einmaliges Verschieben erlauben:
  // Wenn diese Tagesaufgabe bereits das Ziel eines frueheren Snooze war,
  // darf sie nicht erneut weiter verschoben werden.
  const alreadySnoozedHere = await prisma.taskCompletion.findFirst({
    where: {
      taskId,
      status: "SNOOZED",
      snoozedTo: date,
      NOT: { date },
    },
    select: { id: true },
  })
  if (alreadySnoozedHere) {
    throw new Error("Diese Aufgabe wurde bereits verschoben und kann vorerst nicht erneut verschoben werden")
  }

  const sourceAssignment = await prisma.taskAssignment.findFirst({
    where: { taskId, date },
    select: { userId: true, assignedById: true },
  })

  const upsertCompletion = prisma.taskCompletion.upsert({
    where: { taskId_date: { taskId, date } },
    create: { taskId, userId: session.user.id, date, status: "SNOOZED", snoozedTo: tomorrow },
    update: { status: "SNOOZED", snoozedTo: tomorrow },
  })

  if (sourceAssignment) {
    await prisma.$transaction([
      upsertCompletion,
      prisma.taskAssignment.upsert({
        where: { taskId_date: { taskId, date: tomorrow } },
        create: {
          taskId,
          date: tomorrow,
          userId: sourceAssignment.userId,
          assignedById: sourceAssignment.assignedById,
        },
        update: {
          userId: sourceAssignment.userId,
          assignedById: sourceAssignment.assignedById,
        },
      }),
    ])
  } else {
    await upsertCompletion
  }

  revalidatePath("/day")
  revalidatePath("/week")
  revalidatePath("/my-tasks")
}

export async function createTask(formData: FormData) {
  const session = await requireSession()

  const title = (formData.get("title") as string).trim()
  const description = (formData.get("description") as string)?.trim() || null
  const recurrenceType = formData.get("recurrenceType") as string
  const rawAssignedTo = formData.get("assignedToId") as string
  const weekdays = formData.getAll("weekdays").map(Number)
  const monthFrom = formData.get("monthFrom") ? Number(formData.get("monthFrom")) : null
  const monthTo = formData.get("monthTo") ? Number(formData.get("monthTo")) : null
  const validFromRaw = formData.get("validFrom") as string
  const validUntilRaw = formData.get("validUntil") as string
  const interval = Math.max(1, Number(formData.get("interval") || 1))
  const isPrivate = formData.get("isPrivate") === "true"

  // Nur ADMIN darf anderen Nutzern zuweisen
  const assignedToId =
    session.user.role === "ADMIN" && rawAssignedTo ? rawAssignedTo : null

  await prisma.task.create({
    data: {
      title,
      description,
      isPrivate,
      createdById: session.user.id,
      assignedToId,
      recurrence: {
        create: {
          type: recurrenceType,
          interval,
          weekdays: weekdays.length > 0 ? JSON.stringify(weekdays) : null,
          monthFrom,
          monthTo,
          validFrom: validFromRaw ? new Date(validFromRaw) : null,
          validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
        },
      },
    },
  })

  revalidatePath("/day")
  revalidatePath("/week")
  revalidatePath("/my-tasks")
}

export async function createUser(formData: FormData) {
  const session = await getCurrentSession()
  if (session?.user.role !== "ADMIN") throw new Error("Kein Zugriff")

  const username = (formData.get("username") as string).trim()
  const pin = formData.get("pin") as string
  const role = parseRole(String(formData.get("role") ?? ""))
  const pinMinLength = getPinMinLength()

  if (!username || !pin || pin.length < pinMinLength) {
    throw new Error("Ungültige Eingabe")
  }

  const pinHash = await bcrypt.hash(pin, 12)
  await prisma.user.create({
    data: { username, pinHash, role },
  })

  revalidatePath("/admin")
}

export async function claimTask(formData: FormData) {
  const session = await requireSession()

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string
  // scope: "once" = nur dieses Datum, "always" = dauerhaft auf der Aufgabe
  const scope = formData.get("scope") as "once" | "always"
  // targetUserId: Admin kann anderen Nutzer zuweisen; Standard = eigene ID
  const rawTargetUserId = formData.get("targetUserId") as string | null
  const targetUserId = rawTargetUserId || session.user.id
  if (targetUserId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Kein Zugriff")
  }

  const task = await getAuthorizedTask(session.user.id, taskId, date)

  if (scope === "once") {
    // Datumsspezifische Zuweisung (überschreibt dauerhafte für diesen Tag)
    if (task.assignments.length > 0) throw new Error("Aufgabe ist für dieses Datum bereits zugewiesen")
    await prisma.taskAssignment.create({
      data: { taskId, date, userId: targetUserId, assignedById: session.user.id },
    })
  } else {
    // Dauerhafte Zuweisung auf der Aufgabe
    if (task.assignedToId) throw new Error("Aufgabe ist bereits zugewiesen")
    await prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: targetUserId, assignedById: session.user.id },
    })
  }

  revalidatePath("/day")
  revalidatePath("/week")
  revalidatePath("/my-tasks")
}

export async function unclaimTask(formData: FormData) {
  const session = await requireSession()

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string

  const task = await getAuthorizedTask(session.user.id, taskId, date)

  const isAdmin = session.user.role === "ADMIN"

  // Datumsspezifische Zuweisung aufheben
  const dateAssignment = task.assignments[0]
  if (dateAssignment) {
    // Nur der Admin darf die Zuweisung aufheben, wenn sie von einem anderen Nutzer vergeben wurde
    const assignedBySelf = dateAssignment.assignedById === session.user.id || !dateAssignment.assignedById
    if (!isAdmin && (!assignedBySelf || dateAssignment.userId !== session.user.id)) throw new Error("Kein Zugriff")
    await prisma.taskAssignment.delete({ where: { id: dateAssignment.id } })
  } else if (task.assignedToId) {
    // Dauerhafte Zuweisung aufheben
    const assignedBySelf = task.assignedById === session.user.id || !task.assignedById
    if (!isAdmin && (!assignedBySelf || task.assignedToId !== session.user.id)) throw new Error("Kein Zugriff")
    await prisma.task.update({ where: { id: taskId }, data: { assignedToId: null, assignedById: null } })
  }

  revalidatePath("/day")
  revalidatePath("/week")
  revalidatePath("/my-tasks")
}

export async function changePin(formData: FormData) {
  const session = await requireSession()

  const currentPin = formData.get("currentPin") as string
  const newPin = formData.get("newPin") as string
  const confirmPin = formData.get("confirmPin") as string
  const pinMinLength = getPinMinLength()

  if (!newPin || newPin.length < pinMinLength) {
    throw new Error(`PIN muss mindestens ${pinMinLength} Zeichen haben`)
  }
  if (newPin !== confirmPin) throw new Error("PINs stimmen nicht überein")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error("Nutzer nicht gefunden")

  const valid = await bcrypt.compare(currentPin, user.pinHash)
  if (!valid) throw new Error("Aktueller PIN ist falsch")

  const pinHash = await bcrypt.hash(newPin, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinHash,
      sessionVersion: { increment: 1 },
    },
  })

  revalidatePath("/settings")
}

export async function updateTask(taskId: string, formData: FormData) {
  const session = await requireSession()

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) throw new Error("Aufgabe nicht gefunden")

  const isOwner = task.createdById === session.user.id
  const isAdmin = session.user.role === "ADMIN"
  if (!isOwner && !(isAdmin && !task.isPrivate)) throw new Error("Kein Zugriff")

  const title = (formData.get("title") as string).trim()
  const description = (formData.get("description") as string)?.trim() || null
  const recurrenceType = formData.get("recurrenceType") as string
  const rawAssignedTo = formData.get("assignedToId") as string
  const weekdays = formData.getAll("weekdays").map(Number)
  const monthFrom = formData.get("monthFrom") ? Number(formData.get("monthFrom")) : null
  const monthTo = formData.get("monthTo") ? Number(formData.get("monthTo")) : null
  const validFromRaw = formData.get("validFrom") as string
  const validUntilRaw = formData.get("validUntil") as string
  const interval = Math.max(1, Number(formData.get("interval") || 1))
  const isPrivate = formData.get("isPrivate") === "true"

  const assignedToId = isAdmin && rawAssignedTo ? rawAssignedTo : task.assignedToId

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      isPrivate,
      assignedToId,
      recurrence: {
        upsert: {
          create: {
            type: recurrenceType,
            interval,
            weekdays: weekdays.length > 0 ? JSON.stringify(weekdays) : null,
            monthFrom,
            monthTo,
            validFrom: validFromRaw ? new Date(validFromRaw) : null,
            validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
          },
          update: {
            type: recurrenceType,
            interval,
            weekdays: weekdays.length > 0 ? JSON.stringify(weekdays) : null,
            monthFrom,
            monthTo,
            validFrom: validFromRaw ? new Date(validFromRaw) : null,
            validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
          },
        },
      },
    },
  })

  revalidatePath("/day")
  revalidatePath("/week")
  revalidatePath("/my-tasks")
}

export async function adminResetPin(formData: FormData) {
  const session = await getCurrentSession()
  if (session?.user.role !== "ADMIN") throw new Error("Kein Zugriff")

  const userId = formData.get("userId") as string
  const newPin = formData.get("newPin") as string
  const pinMinLength = getPinMinLength()

  if (!newPin || newPin.length < pinMinLength) {
    throw new Error(`PIN muss mindestens ${pinMinLength} Zeichen haben`)
  }

  const pinHash = await bcrypt.hash(newPin, 12)
  await prisma.user.update({
    where: { id: userId },
    data: {
      pinHash,
      sessionVersion: { increment: 1 },
    },
  })

  revalidatePath("/admin")
}

export async function createRecipe(formData: FormData) {
  const session = await requireSession()

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const sourceTypeInput = (formData.get("sourceType") as string) || "APP"
  const sourceType = ALLOWED_RECIPE_SOURCE_TYPES.has(sourceTypeInput)
    ? sourceTypeInput
    : "APP"
  const sourceText = (formData.get("sourceText") as string)?.trim() || null
  const rawUrl = (formData.get("url") as string)?.trim() || null
  const url = sourceType === "LINK" ? sanitizeRecipeUrl(rawUrl) : null

  if (!title) throw new Error("Titel fehlt")
  if (sourceType === "BOOK" && !sourceText) throw new Error("Bitte Buch oder Seitenangabe angeben")
  if (sourceType === "LINK" && !url) throw new Error("Bitte Link angeben")

  await prisma.recipe.create({
    data: {
      title,
      description,
      sourceType,
      sourceText,
      url,
      createdById: session.user.id,
    },
  })

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function updateRecipe(recipeId: string, formData: FormData) {
  const session = await requireSession()

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } })
  if (!recipe) throw new Error("Rezept nicht gefunden")

  const isOwner = recipe.createdById === session.user.id
  const isAdmin = session.user.role === "ADMIN"
  if (!isOwner && !isAdmin) throw new Error("Kein Zugriff")

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const sourceTypeInput = (formData.get("sourceType") as string) || "APP"
  const sourceType = ALLOWED_RECIPE_SOURCE_TYPES.has(sourceTypeInput)
    ? sourceTypeInput
    : "APP"
  const sourceText = (formData.get("sourceText") as string)?.trim() || null
  const rawUrl = (formData.get("url") as string)?.trim() || null
  const url = sourceType === "LINK" ? sanitizeRecipeUrl(rawUrl) : null

  if (!title) throw new Error("Titel fehlt")
  if (sourceType === "BOOK" && !sourceText) throw new Error("Bitte Buch oder Seitenangabe angeben")
  if (sourceType === "LINK" && !url) throw new Error("Bitte Link angeben")

  await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      title,
      description,
      sourceType,
      sourceText,
      url,
    },
  })

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function deleteRecipe(formData: FormData) {
  const session = await requireSession()

  const recipeId = formData.get("recipeId") as string
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } })
  if (!recipe) throw new Error("Rezept nicht gefunden")

  const isOwner = recipe.createdById === session.user.id
  const isAdmin = session.user.role === "ADMIN"
  if (!isOwner && !isAdmin) throw new Error("Kein Zugriff")

  await prisma.$transaction([
    prisma.mealPlan.deleteMany({ where: { recipeId } }),
    prisma.recipe.delete({ where: { id: recipeId } }),
  ])

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function setMealPlan(formData: FormData) {
  const session = await requireSession()

  const date = formData.get("date") as string
  const recipeId = formData.get("recipeId") as string

  if (!date || !recipeId) throw new Error("Ungültige Eingabe")

  await prisma.mealPlan.upsert({
    where: { date },
    create: { date, recipeId, assignedById: session.user.id },
    update: { recipeId, assignedById: session.user.id },
  })

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function clearMealPlan(formData: FormData) {
  const session = await requireSession()

  const date = formData.get("date") as string
  if (!date) throw new Error("Ungültige Eingabe")

  await prisma.mealPlan.deleteMany({ where: { date } })

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}

function normalizeShoppingValue(value: string): string {
  return value.trim().toLowerCase()
}

async function assertShoppingListAccess(userId: string, listId: string) {
  const list = await prisma.shoppingList.findFirst({
    where: {
      id: listId,
      OR: [
        { createdById: userId },
        { isSharedWithAll: true },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  })

  if (!list) throw new Error("Keine Berechtigung für diese Liste")
}

async function assertShoppingItemAccess(userId: string, itemId: string) {
  const item = await prisma.shoppingItem.findFirst({
    where: {
      id: itemId,
      list: {
        OR: [
          { createdById: userId },
          { isSharedWithAll: true },
          { members: { some: { userId } } },
        ],
      },
    },
    select: { id: true, listId: true, nameNormalized: true },
  })

  if (!item) throw new Error("Item nicht gefunden oder keine Berechtigung")
  return item
}

function collectTags(formData: FormData): string[] {
  const selected = formData
    .getAll("selectedTags")
    .map((v) => String(v).trim())
    .filter(Boolean)

  const raw = (formData.get("tags") as string | null)?.trim() ?? ""
  const manual = raw
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean)

  const unique = new Map<string, string>()
  for (const tag of [...selected, ...manual]) {
    const normalized = normalizeShoppingValue(tag)
    if (!normalized) continue
    if (!unique.has(normalized)) unique.set(normalized, tag)
  }
  return Array.from(unique.values())
}

export async function addShoppingItem(formData: FormData) {
  const session = await requireSession()

  const listId = (formData.get("listId") as string)?.trim()
  if (!listId) throw new Error("Liste fehlt")
  await assertShoppingListAccess(session.user.id, listId)

  const name = (formData.get("name") as string)?.trim()
  if (!name) throw new Error("Name fehlt")

  const nameNormalized = normalizeShoppingValue(name)
  const tags = collectTags(formData)

  await prisma.shoppingItem.create({
    data: {
      name,
      nameNormalized,
      createdById: session.user.id,
      listId,
      tags: {
        create: tags.map((tag) => ({
          value: tag,
          valueNormalized: normalizeShoppingValue(tag),
        })),
      },
    },
  })

  if (tags.length > 0) {
    await prisma.$transaction(
      tags.map((tag) =>
        prisma.shoppingTagHistory.upsert({
          where: {
            listId_itemNameNormalized_valueNormalized: {
              listId,
              itemNameNormalized: nameNormalized,
              valueNormalized: normalizeShoppingValue(tag),
            },
          },
          create: {
            listId,
            itemNameNormalized: nameNormalized,
            value: tag,
            valueNormalized: normalizeShoppingValue(tag),
          },
          update: {},
        })
      )
    )
  }

  revalidatePath("/shopping")
}

export async function removeShoppingItem(formData: FormData) {
  const session = await requireSession()

  const itemId = formData.get("itemId") as string
  if (!itemId) throw new Error("Ungültige Eingabe")

  await assertShoppingItemAccess(session.user.id, itemId)

  await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { removedAt: new Date() },
  })

  revalidatePath("/shopping")
}

export async function updateShoppingItemTags(formData: FormData) {
  const session = await requireSession()

  const itemId = formData.get("itemId") as string
  if (!itemId) throw new Error("Ungültige Eingabe")

  const item = await assertShoppingItemAccess(session.user.id, itemId)
  if (!item.listId) throw new Error("Liste nicht gefunden")
  const listId = item.listId

  const tags = collectTags(formData)

  await prisma.$transaction([
    prisma.shoppingItemTag.deleteMany({ where: { itemId } }),
    ...tags.map((tag) =>
      prisma.shoppingItemTag.create({
        data: {
          itemId,
          value: tag,
          valueNormalized: normalizeShoppingValue(tag),
        },
      })
    ),
    ...tags.map((tag) =>
      prisma.shoppingTagHistory.upsert({
        where: {
          listId_itemNameNormalized_valueNormalized: {
            listId,
            itemNameNormalized: item.nameNormalized,
            valueNormalized: normalizeShoppingValue(tag),
          },
        },
        create: {
          listId,
          itemNameNormalized: item.nameNormalized,
          value: tag,
          valueNormalized: normalizeShoppingValue(tag),
        },
        update: {},
      })
    ),
  ])

  revalidatePath("/shopping")
}

export async function restoreShoppingItem(formData: FormData) {
  const session = await requireSession()

  const itemId = formData.get("itemId") as string
  if (!itemId) throw new Error("Ungültige Eingabe")

  await assertShoppingItemAccess(session.user.id, itemId)

  await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { removedAt: null },
  })

  revalidatePath("/shopping")
}

export async function setShoppingView(formData: FormData) {
  const session = await requireSession()

  const view = formData.get("view") as string
  if (view !== "LIST" && view !== "GRID") throw new Error("Ungültige Ansicht")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { shoppingView: view },
  })

  revalidatePath("/shopping")
}

export async function createShoppingList(formData: FormData) {
  const session = await requireSession()

  const name = (formData.get("name") as string)?.trim()
  if (!name) throw new Error("Name fehlt")

  const isSharedWithAll = formData.get("isSharedWithAll") === "true"
  const memberIds = Array.from(new Set(
    formData
      .getAll("memberIds")
      .map((v) => String(v).trim())
      .filter(Boolean)
      .filter((id) => id !== session.user.id)
  ))

  const created = await prisma.shoppingList.create({
    data: {
      name,
      nameNormalized: normalizeShoppingValue(name),
      createdById: session.user.id,
      isSharedWithAll,
      members: isSharedWithAll
        ? undefined
        : {
            create: memberIds.map((userId) => ({ userId })),
          },
    },
  })

  revalidatePath("/shopping")

  return created.id
}
