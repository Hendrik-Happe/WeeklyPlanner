import { getCurrentSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatDate, getTodayInBerlin } from "@/lib/tasks"
import TaskCard from "@/components/TaskCard"
import NewTaskModal from "@/components/NewTaskModal"
import MyTasksFilterBar from "@/components/MyTasksFilterBar"
import { createTask } from "@/app/(app)/actions"
import { redirect } from "next/navigation"
import { Suspense } from "react"

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Einmalig",
  DAILY: "Täglich",
  WEEKLY: "Wöchentlich",
  MONTHLY: "Monatlich",
}

type MyTasksSearchParams = {
  showPast?: string
  onlyAssigned?: string
  onlyCreated?: string
  onlyOpen?: string
}

function getRelevantDateStr(
  task: {
    recurrence: { type: string; validFrom: Date | null } | null
    assignments: { date: string; userId: string }[]
  },
  userId: string
): string | null {
  if (task.recurrence?.type === "ONCE" && task.recurrence.validFrom) {
    return formatDate(new Date(task.recurrence.validFrom))
  }

  const ownAssignmentDates = task.assignments
    .filter((a) => a.userId === userId)
    .map((a) => a.date)
    .sort((a, b) => a.localeCompare(b))

  return ownAssignmentDates[0] ?? null
}

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<MyTasksSearchParams>
}) {
  const {
    showPast: showPastParam,
    onlyAssigned: onlyAssignedParam,
    onlyCreated: onlyCreatedParam,
    onlyOpen: onlyOpenParam,
  } = await searchParams

  const showPast = showPastParam === "1"
  const onlyAssigned = onlyAssignedParam === "1"
  const onlyCreated = onlyCreatedParam === "1"
  const onlyOpen = onlyOpenParam === "1"

  const session = await getCurrentSession()
  if (!session) redirect("/login")
  const isAdmin = session.user.role === "ADMIN"
  const todayStr = formatDate(getTodayInBerlin())

  const users = isAdmin
    ? await prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } })
    : []

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        // Von mir erstellt (auch ohne Zuweisung)
        { createdById: session.user.id },
        // Dauerhaft mir zugewiesen
        { assignedToId: session.user.id },
        // Datumsspezifisch mir zugewiesen
        { assignments: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      recurrence: true,
      completions: true,
      assignments: { include: { user: { select: { id: true, username: true } } } },
      assignedTo: { select: { id: true, username: true } },
      createdBy: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  let visibleTasks = tasks
    .map((task) => {
      const relevantDateStr = getRelevantDateStr(task, session.user.id)
      const isAssignedToMe =
        task.assignedToId === session.user.id ||
        task.assignments.some((a) => a.userId === session.user.id)
      const isCreatedByMe = task.createdById === session.user.id
      const isDone = relevantDateStr
        ? task.completions.some((c) => c.date === relevantDateStr && c.status === "DONE")
        : false

      return {
        task,
        relevantDateStr,
        isAssignedToMe,
        isCreatedByMe,
        isDone,
      }
    })
    .filter((entry) => {
      if (onlyAssigned && !entry.isAssignedToMe) return false
      if (onlyCreated && !entry.isCreatedByMe) return false
      if (onlyOpen && entry.isDone) return false

      if (!showPast && entry.relevantDateStr && entry.relevantDateStr < todayStr && entry.isDone) {
        return false
      }

      if (!showPast && entry.relevantDateStr && entry.relevantDateStr < todayStr && !entry.isDone) {
        return true
      }

      return true
    })

  visibleTasks = visibleTasks.sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1

    const aHasDate = Boolean(a.relevantDateStr)
    const bHasDate = Boolean(b.relevantDateStr)
    if (aHasDate !== bHasDate) return aHasDate ? -1 : 1

    if (a.relevantDateStr && b.relevantDateStr && a.relevantDateStr !== b.relevantDateStr) {
      return a.relevantDateStr.localeCompare(b.relevantDateStr)
    }

    return b.task.createdAt.getTime() - a.task.createdAt.getTime()
  })

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Meine Aufgaben</h1>
        <NewTaskModal action={createTask} users={users} isAdmin={isAdmin} />
      </div>

      <Suspense>
        <MyTasksFilterBar
          showPast={showPast}
          onlyAssigned={onlyAssigned}
          onlyCreated={onlyCreated}
          onlyOpen={onlyOpen}
        />
      </Suspense>

      {visibleTasks.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Noch keine Aufgaben</p>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map(({ task, relevantDateStr }) => (
            <div key={`${task.id}-${relevantDateStr ?? "nodate"}`}>
              {task.recurrence && (
                <p className="text-xs text-gray-400 px-1 mb-1">
                  {RECURRENCE_LABELS[task.recurrence.type] ?? task.recurrence.type}
                  {relevantDateStr && <span> · {relevantDateStr}</span>}
                  {task.createdById !== session.user.id && (
                    <span> · von {task.createdBy.username}</span>
                  )}
                </p>
              )}
              {!task.recurrence && relevantDateStr && (
                <p className="text-xs text-gray-400 px-1 mb-1">{relevantDateStr}</p>
              )}
              <TaskCard
                task={task}
                dateStr={relevantDateStr ?? todayStr}
                userId={session.user.id}
                userRole={session.user.role}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
