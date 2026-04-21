"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/tasks"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function markDone(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

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
  const session = await auth()
  if (session?.user.role !== "ADMIN") throw new Error("Kein Zugriff")

  const username = (formData.get("username") as string).trim()
  const pin = formData.get("pin") as string
  const role = formData.get("role") as string

  if (!username || !pin || pin.length < 4) {
    throw new Error("Ungültige Eingabe")
  }

  const pinHash = await bcrypt.hash(pin, 12)
  await prisma.user.create({
    data: { username, pinHash, role },
  })

  revalidatePath("/admin")
}

export async function claimTask(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

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

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignments: { where: { date } } },
  })
  if (!task) throw new Error("Aufgabe nicht gefunden")

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const taskId = formData.get("taskId") as string
  const date = formData.get("date") as string

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignments: { where: { date } } },
  })
  if (!task) throw new Error("Aufgabe nicht gefunden")

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const currentPin = formData.get("currentPin") as string
  const newPin = formData.get("newPin") as string
  const confirmPin = formData.get("confirmPin") as string

  if (!newPin || newPin.length < 4) throw new Error("PIN muss mindestens 4 Zeichen haben")
  if (newPin !== confirmPin) throw new Error("PINs stimmen nicht überein")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error("Nutzer nicht gefunden")

  const valid = await bcrypt.compare(currentPin, user.pinHash)
  if (!valid) throw new Error("Aktueller PIN ist falsch")

  const pinHash = await bcrypt.hash(newPin, 12)
  await prisma.user.update({ where: { id: user.id }, data: { pinHash } })

  revalidatePath("/settings")
}

export async function updateTask(taskId: string, formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

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
  const session = await auth()
  if (session?.user.role !== "ADMIN") throw new Error("Kein Zugriff")

  const userId = formData.get("userId") as string
  const newPin = formData.get("newPin") as string

  if (!newPin || newPin.length < 4) throw new Error("PIN muss mindestens 4 Zeichen haben")

  const pinHash = await bcrypt.hash(newPin, 12)
  await prisma.user.update({ where: { id: userId }, data: { pinHash } })

  revalidatePath("/admin")
}

export async function createRecipe(formData: FormData) {
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const sourceType = (formData.get("sourceType") as string) || "APP"
  const sourceText = (formData.get("sourceText") as string)?.trim() || null
  const url = (formData.get("url") as string)?.trim() || null

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } })
  if (!recipe) throw new Error("Rezept nicht gefunden")

  const isOwner = recipe.createdById === session.user.id
  const isAdmin = session.user.role === "ADMIN"
  if (!isOwner && !isAdmin) throw new Error("Kein Zugriff")

  const title = (formData.get("title") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() || null
  const sourceType = (formData.get("sourceType") as string) || "APP"
  const sourceText = (formData.get("sourceText") as string)?.trim() || null
  const url = (formData.get("url") as string)?.trim() || null

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

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
  const session = await auth()
  if (!session) throw new Error("Nicht angemeldet")

  const date = formData.get("date") as string
  if (!date) throw new Error("Ungültige Eingabe")

  await prisma.mealPlan.deleteMany({ where: { date } })

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}
