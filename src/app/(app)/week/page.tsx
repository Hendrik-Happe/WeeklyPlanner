import { getCurrentSession } from "@/lib/auth"
import { eventSpansDate, getCalendarEventsForRange, mergeCalendarEvents } from "@/lib/calendar"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import MealPlanCard from "@/components/MealPlanCard"
import { formatDate, getTodayInBerlin, getTasksForDate, resolveAssignedTo } from "@/lib/tasks"
import { getMealPlansForDates, getRecipes } from "@/lib/meals"
import TaskCard from "@/components/TaskCard"
import WeekNav from "@/components/WeekNav"
import FilterBar from "@/components/FilterBar"
import { redirect } from "next/navigation"

function formatTimeRange(startTime: string | null, endTime: string | null, date: string, endDate: string | null): string {
  const dayRange = endDate && endDate !== date ? `${date} bis ${endDate} · ` : ""
  if (startTime && endTime) return `${dayRange}${startTime} - ${endTime}`
  if (startTime) return `ab ${startTime}`
  if (endTime) return `bis ${endTime}`
  return `${dayRange}ganztägig`
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; hideDone?: string; hideAssigned?: string }>
}) {
  const { week: weekParam, hideDone: hideDoneParam, hideAssigned: hideAssignedParam } = await searchParams
  const weekOffset = parseInt(weekParam ?? "0", 10) || 0
  const hideDone = hideDoneParam === "1"
  const hideAssigned = hideAssignedParam === "1"

  const session = await getCurrentSession()
  if (!session) redirect("/login")
  const today = getTodayInBerlin()

  // Ausgangsdatum: heute + weekOffset * 7 Tage
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)

  const weekDays = getWeekDays(baseDate)
  const todayStr = formatDate(today)
  const monday = weekDays[0]
  const sunday = weekDays[6]

  const kw = getISOWeek(monday)
  const year = monday.getFullYear() !== sunday.getFullYear()
    ? `${monday.getFullYear()}/${sunday.getFullYear()}`
    : monday.getFullYear()
  const weekLabel = `KW ${kw} – ${year}`

  const isAdmin = session.user.role === "ADMIN"
  const users = isAdmin
    ? await prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } })
    : undefined
  const dateStrings = weekDays.map((day) => formatDate(day))
  const [mealPlansByDate, recipes, { localEvents, externalEvents }] = await Promise.all([
    getMealPlansForDates(dateStrings),
    getRecipes(),
    getCalendarEventsForRange(session.user.id, formatDate(monday), formatDate(sunday)),
  ])
  const events = mergeCalendarEvents(localEvents, externalEvents)
  const eventsByDay = new Map<string, typeof events>()
  for (const date of dateStrings) {
    eventsByDay.set(
      date,
      events.filter((event) => eventSpansDate(event, date)),
    )
  }

  const tasksByDay = await Promise.all(
    weekDays.map(async (day) => {
      const dateStr = formatDate(day)
      let tasks = await getTasksForDate(dateStr, session.user.id)
      if (hideDone) tasks = tasks.filter((t) => !t.completions.some((c: { date: string; status: string }) => c.date === dateStr && c.status === "DONE"))
      if (hideAssigned) tasks = tasks.filter((t) => !resolveAssignedTo(t, dateStr))
      return { date: day, dateStr, tasks }
    })
  )

  return (
    <div className="max-w-2xl mx-auto p-4">
      <WeekNav week={weekOffset} label={weekLabel} />
      <Suspense><FilterBar hideDone={hideDone} hideAssigned={hideAssigned} /></Suspense>
      <div className="space-y-3">
        {tasksByDay.map(({ date, dateStr, tasks }) => (
          <div
            key={dateStr}
            className={`rounded-xl p-3 border ${
              dateStr === todayStr
                ? "bg-blue-50 border-blue-200"
                : "bg-white border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="font-semibold text-sm">
                {date.toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "numeric",
                  timeZone: "Europe/Berlin",
                })}
                {dateStr === todayStr && (
                  <span className="ml-2 text-xs text-blue-500 font-normal">Heute</span>
                )}
              </h2>
              <span className="text-xs text-gray-400">{tasks.length} Aufgaben</span>
            </div>
            <div className="mb-2">
              <MealPlanCard
                dateStr={dateStr}
                mealPlans={mealPlansByDate.get(dateStr) ?? []}
                recipes={recipes}
                compact
              />
            </div>
            <div className="mb-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Termine</p>
              {(eventsByDay.get(dateStr) ?? []).length === 0 ? (
                <p className="text-xs text-gray-400">Keine Termine</p>
              ) : (
                <div className="space-y-1">
                  {(eventsByDay.get(dateStr) ?? []).map((event) => (
                    <div key={`${event.source}-${event.id}`} className="text-xs text-gray-700">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-gray-500"> · {formatTimeRange(event.startTime, event.endTime, event.date, event.endDate)}</span>
                      {event.source === "NEXTCLOUD" && (
                        <span className="text-gray-500"> · {event.calendarName ?? "Nextcloud"}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-gray-300">Frei</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dateStr={dateStr}
                    userId={session.user.id}
                    userRole={session.user.role}
                    users={users}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
