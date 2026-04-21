import { getCurrentSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"
import { getMealPlanForDate, getRecipes } from "@/lib/meals"
import { formatDate, getTodayInBerlin, getTasksForDate, resolveAssignedTo } from "@/lib/tasks"
import MealPlanCard from "@/components/MealPlanCard"
import TaskCard from "@/components/TaskCard"
import FilterBar from "@/components/FilterBar"
import { redirect } from "next/navigation"

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
  const [mealPlan, recipes] = await Promise.all([
    getMealPlanForDate(dateStr),
    getRecipes(),
  ])

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
      <h1 className="text-xl font-bold mb-1">Heute</h1>
      <p className="text-gray-500 text-sm mb-2 capitalize">{dayLabel}</p>
      <Suspense><FilterBar hideDone={hideDone} hideAssigned={hideAssigned} /></Suspense>
      <div className="mb-4">
        <MealPlanCard dateStr={dateStr} mealPlan={mealPlan} recipes={recipes} />
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
