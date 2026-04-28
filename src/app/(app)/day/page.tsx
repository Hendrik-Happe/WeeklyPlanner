import { getCurrentSession } from "@/lib/auth"
import { eventSpansDate, getCalendarEventsForRange, mergeCalendarEvents } from "@/lib/calendar"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import { getMealPlansForDate, getRecipes } from "@/lib/meals"
import { formatDate, getTodayInBerlin, getTasksForDate, resolveAssignedTo } from "@/lib/tasks"
import MealPlanCard from "@/components/MealPlanCard"
import TaskCard from "@/components/TaskCard"
import FilterBar from "@/components/FilterBar"
import NewTaskModal from "@/components/NewTaskModal"
import { createTask } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

function formatTimeRange(startTime: string | null, endTime: string | null, date: string, endDate: string | null): string {
  const dayRange = endDate && endDate !== date ? `${date} bis ${endDate} · ` : ""
  if (startTime && endTime) return `${dayRange}${startTime} - ${endTime}`
  if (startTime) return `ab ${startTime}`
  if (endTime) return `bis ${endTime}`
  return `${dayRange}ganztägig`
}

export default async function DayPage({
  searchParams,
}: {
  searchParams: Promise<{ hideDone?: string; hideAssigned?: string }>
}) {
  const { hideDone: hideDoneParam, hideAssigned: hideAssignedParam } = await searchParams
  const hideDone = hideDoneParam === "1"
  const hideAssigned = hideAssignedParam === "1"

  const session = await getCurrentSession()
  if (!session) redirect("/login")
  const today = getTodayInBerlin()
  const dateStr = formatDate(today)
  let tasks = await getTasksForDate(dateStr, session.user.id)
  const [mealPlans, recipes, { localEvents, externalEvents }] = await Promise.all([
    getMealPlansForDate(dateStr),
    getRecipes(),
    getCalendarEventsForRange(session.user.id, dateStr, dateStr),
  ])
  const events = mergeCalendarEvents(localEvents, externalEvents).filter((event) => eventSpansDate(event, dateStr))

  if (hideDone) tasks = tasks.filter((t) => !t.completions.some((c: { date: string; status: string }) => c.date === dateStr && c.status === "DONE"))
  if (hideAssigned) tasks = tasks.filter((t) => !resolveAssignedTo(t, dateStr))

  const isAdmin = session.user.role === "ADMIN"
  const users = isAdmin
    ? await prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } })
    : undefined

  const dayLabel = today.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Berlin",
  })

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Heute</h1>
        <NewTaskModal action={createTask} users={users ?? []} isAdmin={isAdmin} />
      </div>
      <p className="text-gray-500 text-sm mb-2 capitalize">{dayLabel}</p>
      <Suspense><FilterBar hideDone={hideDone} hideAssigned={hideAssigned} /></Suspense>
      <div className="mb-4">
        <MealPlanCard dateStr={dateStr} mealPlans={mealPlans} recipes={recipes} />
      </div>
      <div className="mb-4 rounded-xl border border-gray-100 bg-white p-3">
        <h2 className="font-semibold text-sm mb-2">Termine heute</h2>
        {events.length === 0 ? (
          <p className="text-xs text-gray-400">Keine Termine</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={`${event.source}-${event.id}`} className="rounded-md border border-gray-200 px-2 py-1.5">
                <p className="text-sm font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">
                  {formatTimeRange(event.startTime, event.endTime, event.date, event.endDate)}
                  {event.source === "NEXTCLOUD" && ` · ${event.calendarName ?? "Nextcloud"}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-center py-16 text-lg">Keine Aufgaben für heute 🎉</p>
      ) : (
        <div className="space-y-3">
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
  )
}
