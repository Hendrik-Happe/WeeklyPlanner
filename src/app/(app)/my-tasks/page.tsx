import { getCurrentSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatDate, getTodayInBerlin } from "@/lib/tasks"
import TaskCard from "@/components/TaskCard"
import NewTaskModal from "@/components/NewTaskModal"
import { createTask } from "@/app/(app)/actions"
import { redirect } from "next/navigation"

const RECURRENCE_LABELS: Record<string, string> = {
  ONCE: "Einmalig",
  DAILY: "Täglich",
  WEEKLY: "Wöchentlich",
  MONTHLY: "Monatlich",
}

export default async function MyTasksPage() {
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
        // Dauerhaft mir zugewiesen
        { assignedToId: session.user.id },
        // Meine privaten Aufgaben (von mir erstellt, nur für mich sichtbar)
        { isPrivate: true, createdById: session.user.id },
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

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Meine Aufgaben</h1>
        <NewTaskModal action={createTask} users={users} isAdmin={isAdmin} />
      </div>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-center py-16">Noch keine Aufgaben</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: (typeof tasks)[number]) => (
            <div key={task.id}>
              {task.recurrence && (
                <p className="text-xs text-gray-400 px-1 mb-1">
                  {RECURRENCE_LABELS[task.recurrence.type] ?? task.recurrence.type}
                  {task.createdById !== session.user.id && (
                    <span> · von {task.createdBy.username}</span>
                  )}
                </p>
              )}
              <TaskCard
                task={task}
                dateStr={todayStr}
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
