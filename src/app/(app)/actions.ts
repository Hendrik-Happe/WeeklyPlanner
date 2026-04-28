"use server"

import { getCurrentSession } from "@/lib/auth"
import {
  createCalendarEventInNextcloud,
  deleteCalendarEventInNextcloud,
  discoverNextcloudCalendars,
  getCalendarSyncSettingsView,
  updateCalendarEventInNextcloud,
} from "@/lib/calendar"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/tasks"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { getPasswordRuleText, isValidPasswordFormat } from "@/lib/security-config"
import { isUsernameTakenInsensitive } from "@/lib/username"

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

function sanitizeCalendarUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error("Ungültige Kalender-URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Ungültige Kalender-URL")
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
  const password = formData.get("password") as string
  const role = parseRole(String(formData.get("role") ?? ""))

  if (!username || !password || !isValidPasswordFormat(password)) {
    throw new Error(getPasswordRuleText())
  }

  if (await isUsernameTakenInsensitive(username)) {
    throw new Error("Benutzername existiert bereits")
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { username, passwordHash, role },
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

export async function changePassword(formData: FormData) {
  const session = await requireSession()

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!newPassword || !isValidPasswordFormat(newPassword)) {
    throw new Error(getPasswordRuleText())
  }
  if (newPassword !== confirmPassword) throw new Error("Passwörter stimmen nicht überein")

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) throw new Error("Nutzer nicht gefunden")

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw new Error("Aktuelles Passwort ist falsch")

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
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

export async function adminResetPassword(formData: FormData) {
  const session = await getCurrentSession()
  if (session?.user.role !== "ADMIN") throw new Error("Kein Zugriff")

  const userId = formData.get("userId") as string
  const newPassword = formData.get("newPassword") as string

  if (!newPassword || !isValidPasswordFormat(newPassword)) {
    throw new Error(getPasswordRuleText())
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
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
    where: { date_recipeId: { date, recipeId } },
    create: { date, recipeId, assignedById: session.user.id },
    update: { assignedById: session.user.id },
  })

  revalidatePath("/meals")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function removeMealPlanEntry(formData: FormData) {
  await requireSession()

  const date = formData.get("date") as string
  const recipeId = formData.get("recipeId") as string
  if (!date || !recipeId) throw new Error("Ungültige Eingabe")

  await prisma.mealPlan.deleteMany({ where: { date, recipeId } })

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

export async function createCalendarEvent(formData: FormData) {
  const session = await requireSession()

  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || null
  const date = String(formData.get("date") ?? "").trim()
  const endDateInput = String(formData.get("endDate") ?? "").trim()
  const isAllDay = formData.get("isAllDay") === "on"
  const startTimeInput = String(formData.get("startTime") ?? "").trim() || null
  const endTimeInput = String(formData.get("endTime") ?? "").trim() || null
  const endDate = endDateInput || null
  const startTime = isAllDay ? null : startTimeInput
  const endTime = isAllDay ? null : endTimeInput
  const calendarTarget = String(formData.get("calendarTarget") ?? "local").trim()

  if (!title || !date) throw new Error("Titel und Datum sind erforderlich")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ungültiges Datum")
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Ungültiges Enddatum")
  if (endDate && endDate < date) throw new Error("Enddatum muss am oder nach dem Startdatum liegen")
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) throw new Error("Ungültige Startzeit")
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) throw new Error("Ungültige Endzeit")
  if (startTime && endTime && (endDate ?? date) === date && endTime < startTime) {
    throw new Error("Endzeit muss nach Startzeit liegen")
  }

  const { discoveredCalendars } = await getCalendarSyncSettingsView(session.user.id)
  const allowedCalendarUrls = new Set(discoveredCalendars.map((entry) => entry.url))

  if (calendarTarget !== "local") {
    let targetUrl: URL
    try {
      targetUrl = new URL(calendarTarget)
    } catch {
      throw new Error("Ungültiger Zielkalender")
    }
    if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
      throw new Error("Ungültiger Zielkalender")
    }
    if (!allowedCalendarUrls.has(calendarTarget)) {
      throw new Error("Zielkalender ist nicht freigegeben")
    }
    await createCalendarEventInNextcloud(session.user.id, calendarTarget, {
      title,
      description,
      date,
      endDate,
      startTime,
      endTime,
    })
  } else {
    await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title,
        description,
        date,
        endDate,
        startTime,
        endTime,
      },
    })
  }

  revalidatePath("/calendar")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function deleteCalendarEvent(formData: FormData) {
  const session = await requireSession()

  const id = String(formData.get("eventId") ?? "").trim()
  if (!id) throw new Error("Ungültige Eingabe")

  await prisma.calendarEvent.deleteMany({ where: { id, userId: session.user.id } })

  revalidatePath("/calendar")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function updateNextcloudCalendarEvent(formData: FormData) {
  const session = await requireSession()

  const eventId = String(formData.get("eventId") ?? "").trim()
  const calendarUrl = String(formData.get("calendarUrl") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || null
  const date = String(formData.get("date") ?? "").trim()
  const endDateInput = String(formData.get("endDate") ?? "").trim()
  const isAllDay = formData.get("isAllDay") === "on"
  const startTimeInput = String(formData.get("startTime") ?? "").trim() || null
  const endTimeInput = String(formData.get("endTime") ?? "").trim() || null
  const endDate = endDateInput || null
  const startTime = isAllDay ? null : startTimeInput
  const endTime = isAllDay ? null : endTimeInput

  if (!eventId || !calendarUrl || !title || !date) throw new Error("Ungültige Eingabe")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ungültiges Datum")
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Ungültiges Enddatum")
  if (endDate && endDate < date) throw new Error("Enddatum muss am oder nach dem Startdatum liegen")
  if (startTime && !/^\d{2}:\d{2}$/.test(startTime)) throw new Error("Ungültige Startzeit")
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime)) throw new Error("Ungültige Endzeit")
  if (startTime && endTime && (endDate ?? date) === date && endTime < startTime) {
    throw new Error("Endzeit muss nach Startzeit liegen")
  }

  const { discoveredCalendars } = await getCalendarSyncSettingsView(session.user.id)
  const allowedCalendarUrls = new Set(discoveredCalendars.map((entry) => entry.url))
  if (!allowedCalendarUrls.has(calendarUrl)) {
    throw new Error("Zielkalender ist nicht freigegeben")
  }

  await updateCalendarEventInNextcloud(session.user.id, calendarUrl, eventId, {
    title,
    description,
    date,
    endDate,
    startTime,
    endTime,
  })

  revalidatePath("/calendar")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function deleteNextcloudCalendarEvent(formData: FormData) {
  const session = await requireSession()

  const eventId = String(formData.get("eventId") ?? "").trim()
  const calendarUrl = String(formData.get("calendarUrl") ?? "").trim()
  if (!eventId || !calendarUrl) throw new Error("Ungültige Eingabe")

  const { discoveredCalendars } = await getCalendarSyncSettingsView(session.user.id)
  const allowedCalendarUrls = new Set(discoveredCalendars.map((entry) => entry.url))
  if (!allowedCalendarUrls.has(calendarUrl)) {
    throw new Error("Zielkalender ist nicht freigegeben")
  }

  await deleteCalendarEventInNextcloud(session.user.id, calendarUrl, eventId)

  revalidatePath("/calendar")
  revalidatePath("/day")
  revalidatePath("/week")
}

export async function saveCalendarSyncSettings(formData: FormData) {
  const session = await requireSession()

  const enabled = formData.get("enabled") === "on"
  const rawServerUrl = String(formData.get("nextcloudServerUrl") ?? "").trim()
  const rawUrl = String(formData.get("nextcloudIcsUrl") ?? "").trim()
  const nextcloudUsername = String(formData.get("nextcloudUsername") ?? "").trim() || null
  const nextcloudAppPasswordInput = String(formData.get("nextcloudAppPassword") ?? "").trim()
  const keepExistingPassword = formData.get("keepNextcloudAppPassword") === "1"
  const nextcloudServerUrl = sanitizeCalendarUrl(rawServerUrl || null)
  const nextcloudIcsUrl = sanitizeCalendarUrl(rawUrl || null)

  const existing = await prisma.calendarSyncSetting.findUnique({
    where: { userId: session.user.id },
    select: { nextcloudAppPassword: true },
  })

  const nextcloudAppPassword = nextcloudAppPasswordInput
    ? nextcloudAppPasswordInput
    : keepExistingPassword
    ? existing?.nextcloudAppPassword ?? null
    : null

  await prisma.calendarSyncSetting.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      enabled,
      nextcloudServerUrl,
      nextcloudIcsUrl,
      nextcloudUsername,
      nextcloudAppPassword,
    },
    update: {
      enabled,
      nextcloudServerUrl,
      nextcloudIcsUrl,
      nextcloudUsername,
      nextcloudAppPassword,
    },
  })

  revalidatePath("/settings")
  revalidatePath("/calendar")
}

export async function disconnectNextcloudOAuth() {
  const session = await requireSession()

  await prisma.calendarSyncSetting.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      enabled: false,
    },
    update: {
      oauthAccessToken: null,
      oauthRefreshToken: null,
      oauthTokenExpiresAt: null,
      oauthState: null,
      oauthStateExpiresAt: null,
      enabled: false,
    },
  })

  revalidatePath("/settings")
  revalidatePath("/calendar")
}

export async function refreshNextcloudSharedCalendars() {
  const session = await requireSession()

  const discovered = await discoverNextcloudCalendars(session.user.id)
  const { selectedCalendarUrls } = await getCalendarSyncSettingsView(session.user.id)

  const discoveredUrlSet = new Set(discovered.map((entry) => entry.url))
  const nextSelected = selectedCalendarUrls.filter((url) => discoveredUrlSet.has(url))

  await prisma.calendarSyncSetting.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      enabled: true,
      discoveredCalendarsJson: JSON.stringify(discovered),
      selectedCalendarUrlsJson: JSON.stringify(nextSelected),
    },
    update: {
      discoveredCalendarsJson: JSON.stringify(discovered),
      selectedCalendarUrlsJson: JSON.stringify(nextSelected),
      enabled: true,
    },
  })

  revalidatePath("/settings")
  revalidatePath("/calendar")
}

export async function updateSelectedNextcloudCalendars(formData: FormData) {
  const session = await requireSession()

  const requestedUrls = formData
    .getAll("selectedCalendarUrls")
    .map((value) => String(value).trim())
    .filter(Boolean)

  const { discoveredCalendars } = await getCalendarSyncSettingsView(session.user.id)
  const allowed = new Set(discoveredCalendars.map((entry) => entry.url))
  const selected = requestedUrls.filter((url) => allowed.has(url))

  await prisma.calendarSyncSetting.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      enabled: true,
      selectedCalendarUrlsJson: JSON.stringify(selected),
    },
    update: {
      selectedCalendarUrlsJson: JSON.stringify(selected),
      enabled: true,
    },
  })

  revalidatePath("/settings")
  revalidatePath("/calendar")
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

export async function addShoppingListMembers(formData: FormData) {
  const session = await requireSession()

  const listId = String(formData.get("listId") ?? "").trim()
  if (!listId) throw new Error("Liste fehlt")

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { id: true, createdById: true, isSharedWithAll: true },
  })

  if (!list) throw new Error("Liste nicht gefunden")
  if (list.createdById !== session.user.id) {
    throw new Error("Nur der Ersteller darf weitere Nutzer hinzufügen")
  }
  if (list.isSharedWithAll) {
    throw new Error("Diese Liste ist bereits mit allen Nutzern geteilt")
  }

  const memberIds = Array.from(
    new Set(
      formData
        .getAll("memberIds")
        .map((v) => String(v).trim())
        .filter(Boolean)
        .filter((id) => id !== session.user.id)
    )
  )

  if (memberIds.length === 0) return

  await prisma.$transaction(
    memberIds.map((userId) =>
      prisma.shoppingListMember.upsert({
        where: {
          listId_userId: { listId, userId },
        },
        update: {},
        create: { listId, userId },
      })
    )
  )

  revalidatePath("/shopping")
}

export async function removeShoppingListMember(formData: FormData) {
  const session = await requireSession()

  const listId = String(formData.get("listId") ?? "").trim()
  const memberId = String(formData.get("memberId") ?? "").trim()
  if (!listId || !memberId) throw new Error("Ungültige Eingabe")

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { id: true, createdById: true },
  })

  if (!list) throw new Error("Liste nicht gefunden")
  if (list.createdById !== session.user.id) {
    throw new Error("Nur der Ersteller darf Nutzer entfernen")
  }

  await prisma.shoppingListMember.deleteMany({
    where: { listId, userId: memberId },
  })

  revalidatePath("/shopping")
}

export async function shareShoppingListWithAll(formData: FormData) {
  const session = await requireSession()

  const listId = String(formData.get("listId") ?? "").trim()
  if (!listId) throw new Error("Liste fehlt")

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { id: true, createdById: true, isSharedWithAll: true },
  })

  if (!list) throw new Error("Liste nicht gefunden")
  if (list.createdById !== session.user.id) {
    throw new Error("Nur der Ersteller darf die Freigabe ändern")
  }
  if (list.isSharedWithAll) return

  await prisma.$transaction([
    prisma.shoppingList.update({
      where: { id: listId },
      data: { isSharedWithAll: true },
    }),
    prisma.shoppingListMember.deleteMany({ where: { listId } }),
  ])

  revalidatePath("/shopping")
}

export async function unshareShoppingListWithAll(formData: FormData) {
  const session = await requireSession()

  const listId = String(formData.get("listId") ?? "").trim()
  if (!listId) throw new Error("Liste fehlt")

  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { id: true, createdById: true, isSharedWithAll: true },
  })

  if (!list) throw new Error("Liste nicht gefunden")
  if (list.createdById !== session.user.id) {
    throw new Error("Nur der Ersteller darf die Freigabe ändern")
  }
  if (!list.isSharedWithAll) return

  await prisma.shoppingList.update({
    where: { id: listId },
    data: { isSharedWithAll: false },
  })

  revalidatePath("/shopping")
}
