import { prisma } from "@/lib/prisma"

/** Gibt das Datum als ISO-String "YYYY-MM-DD" in Europe/Berlin zurück */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })
}

/** Heutiges Datum in der Europe/Berlin Zeitzone als Date-Objekt (Mitternacht UTC) */
export function getTodayInBerlin(): Date {
  const str = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })
  return new Date(str + "T00:00:00")
}

type FullTask = Awaited<ReturnType<typeof fetchAllTasks>>[0]

async function fetchAllTasks(userId: string) {
  return prisma.task.findMany({
    where: {
      OR: [
        { isPrivate: false },
        { isPrivate: true, createdById: userId },
        { isPrivate: true, assignedToId: userId },
      ],
    },
    include: {
      recurrence: true,
      completions: true,
      assignments: { include: { user: { select: { id: true, username: true } } } },
      assignedTo: { select: { id: true, username: true } },
      createdBy: { select: { id: true, username: true } },
    },
  })
}

function isActiveOnDate(task: FullTask, dateStr: string): boolean {
  const rule = task.recurrence
  if (!rule) return false

  const date = new Date(dateStr + "T00:00:00")
  const dayOfWeek = date.getDay() // 0=So, 1=Mo, ..., 6=Sa
  const month = date.getMonth() + 1 // 1–12

  // Gültigkeitszeitraum prüfen (rein string-basiert um Timezone-Fehler zu vermeiden)
  if (rule.validFrom && dateStr < formatDate(new Date(rule.validFrom))) return false
  if (rule.validUntil && dateStr > formatDate(new Date(rule.validUntil))) return false

  // Monatsspanne prüfen (z.B. nur April–September)
  if (rule.monthFrom !== null && rule.monthTo !== null &&
      rule.monthFrom !== undefined && rule.monthTo !== undefined) {
    if (rule.monthFrom <= rule.monthTo) {
      if (month < rule.monthFrom || month > rule.monthTo) return false
    } else {
      // Jahreswechsel (z.B. Nov–Feb)
      if (month < rule.monthFrom && month > rule.monthTo) return false
    }
  }

  switch (rule.type) {
    case "ONCE": {
      if (!rule.validFrom) return false
      return dateStr === formatDate(new Date(rule.validFrom))
    }

    case "DAILY":
      return true

    case "WEEKLY": {
      const weeklyAnchorStr = rule.validFrom
        ? formatDate(new Date(rule.validFrom))
        : formatDate(new Date(task.createdAt))
      const weeklyAnchor = new Date(weeklyAnchorStr + "T00:00:00")

      if (rule.weekdays) {
        const days: number[] = JSON.parse(rule.weekdays)
        if (!days.includes(dayOfWeek)) return false

        // Bei Wochen-Intervallen (z.B. alle 2 Wochen) muss auch mit gesetzten
        // Wochentagen die Intervalllogik relativ zu validFrom gelten.
        if (rule.interval <= 1) return true

        const diffDays = Math.floor((date.getTime() - weeklyAnchor.getTime()) / 86400000)
        const diffWeeks = Math.floor(diffDays / 7)
        return diffWeeks >= 0 && diffWeeks % rule.interval === 0
      }
      // Alle x Wochen ab validFrom
      if (date.getDay() !== weeklyAnchor.getDay()) return false
      const diffDays = Math.floor((date.getTime() - weeklyAnchor.getTime()) / 86400000)
      const diffWeeks = Math.floor(diffDays / 7)
      return diffWeeks >= 0 && diffWeeks % rule.interval === 0
    }

    case "MONTHLY": {
      if (rule.validFrom) {
        const start = new Date(rule.validFrom)
        if (date.getDate() !== start.getDate()) return false
        const diffMonths =
          (date.getFullYear() - start.getFullYear()) * 12 +
          (date.getMonth() - start.getMonth())
        return diffMonths >= 0 && diffMonths % rule.interval === 0
      }
      return false
    }

    default:
      return false
  }
}

/** Effektiv zugewiesener Nutzer für ein Datum:
 *  Datumsspezifische Zuweisung hat Vorrang vor der dauerhaften Task-Zuweisung */
export function resolveAssignedTo(
  task: { assignedTo: { id: string; username: string } | null; assignments: { date: string; user: { id: string; username: string } }[] },
  dateStr: string
): { id: string; username: string } | null {
  const dateSpecific = task.assignments.find((a) => a.date === dateStr)
  return dateSpecific ? dateSpecific.user : task.assignedTo
}

export async function getTasksForDate(dateStr: string, userId: string) {
  const allTasks = await fetchAllTasks(userId)

  // Aktive Aufgaben: auch erledigte einschließen (für Anzeige), nur SNOOZED herausfiltern
  const active = allTasks.filter((task) => {
    const completion = task.completions.find((c) => c.date === dateStr)
    if (completion?.status === "SNOOZED") return false
    return isActiveOnDate(task, dateStr)
  })

  // Aufgaben die explizit auf dieses Datum verschoben wurden
  const snoozed = await prisma.taskCompletion.findMany({
    where: {
      snoozedTo: dateStr,
      status: "SNOOZED",
      task: {
        completions: {
          // Wenn es fuer dieses Datum bereits einen eigenen Status gibt (DONE oder SNOOZED),
          // soll ein alter Snooze-Hop auf dieses Datum nicht mehr sichtbar sein.
          none: { date: dateStr },
        },
        OR: [
          { isPrivate: false },
          { isPrivate: true, createdById: userId },
          { isPrivate: true, assignedToId: userId },
        ],
      },
    },
    include: {
      task: {
        include: {
          recurrence: true,
          completions: true,
          assignments: { include: { user: { select: { id: true, username: true } } } },
          assignedTo: { select: { id: true, username: true } },
          createdBy: { select: { id: true, username: true } },
        },
      },
    },
  })

  const activeIds = new Set(active.map((t) => t.id))
  const snoozedTasks = snoozed
    .filter((c) => {
      const latestSnoozeDate = c.task.completions
        .filter((x) => x.status === "SNOOZED")
        .map((x) => x.date)
        .sort()
        .at(-1)

      // Nur den neuesten Snooze-Hop der Aufgabe berücksichtigen.
      return latestSnoozeDate === c.date
    })
    .map((c) => c.task)
    .filter((t) => !activeIds.has(t.id))

  // Sicherheitsnetz: gleiche Aufgabe kann ueber mehrere Snooze-Hops mehrfach auftauchen.
  // Ergebnis strikt nach Task-ID deduplizieren.
  const merged = [...active, ...snoozedTasks]
  const uniqueById = new Map<string, (typeof merged)[number]>()
  for (const task of merged) {
    if (!uniqueById.has(task.id)) {
      uniqueById.set(task.id, task)
    }
  }

  return Array.from(uniqueById.values())
}
