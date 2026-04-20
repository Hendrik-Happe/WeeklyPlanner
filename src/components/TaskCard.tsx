import Link from "next/link"
import { markDone, snoozeTask, claimTask, unclaimTask } from "@/app/(app)/actions"
import { resolveAssignedTo } from "@/lib/tasks"

type Props = {
  task: {
    id: string
    title: string
    description: string | null
    isPrivate?: boolean
    createdById?: string
    assignedTo: { id: string; username: string } | null
    assignedById?: string | null
    assignments: { date: string; assignedById?: string | null; user: { id: string; username: string } }[]
    completions: { status: string; date: string; snoozedTo?: string | null }[]
    recurrence: { type: string } | null
  }
  dateStr: string
  userId: string
  userRole: string
  users?: { id: string; username: string }[]
}

export default function TaskCard({ task, dateStr, userId, userRole, users }: Props) {
  const completion = task.completions.find((c) => c.date === dateStr)
  const isDone = completion?.status === "DONE"
  const isSnoozed = completion?.status === "SNOOZED"
  const isSnoozedOccurrence = task.completions.some(
    (c) => c.status === "SNOOZED" && c.snoozedTo === dateStr && c.date !== dateStr
  )

  const effectiveAssignee = resolveAssignedTo(task, dateStr)
  const isDateSpecificAssignment = task.assignments.some((a) => a.date === dateStr)
  const isAssigned = !!effectiveAssignee
  const isAssignedToMe = effectiveAssignee?.id === userId
  const isOnce = !task.recurrence || task.recurrence.type === "ONCE"
  const isAdmin = userRole === "ADMIN"
  const isOwner = task.createdById === userId

  // Darf der Nutzer die Zuweisung aufheben?
  // Nein, wenn sie von einem anderen Nutzer (Admin) vergeben wurde.
  const activeDateAssignment = task.assignments.find((a) => a.date === dateStr)
  const activeAssignedById = activeDateAssignment
    ? (activeDateAssignment.assignedById ?? null)
    : (task.assignedById ?? null)
  const assignedBySelf = !activeAssignedById || activeAssignedById === userId
  const canUnclaim = isAdmin || (isAssignedToMe && assignedBySelf)

  const canEdit = isOwner || (isAdmin && !task.isPrivate)

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 border transition-all ${
        isDone
          ? "border-green-100 bg-green-50/40 opacity-70"
          : isAssignedToMe
          ? "border-blue-200"
          : isAssigned
          ? "border-amber-100"
          : "border-gray-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Status-Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isDone && (
              <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                ✓ Erledigt
              </span>
            )}
            {isSnoozed && (
              <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                ↷ Verschoben
              </span>
            )}
            {!isDone && isAssignedToMe && (
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                👤 Ich mache das{isDateSpecificAssignment ? " (nur heute)" : ""}
              </span>
            )}
            {!isDone && isAssigned && !isAssignedToMe && (
              <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                👤 {effectiveAssignee!.username}{isDateSpecificAssignment ? " (nur heute)" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h3 className={`font-semibold leading-snug ${isDone ? "line-through text-gray-400" : ""}`}>
              {task.title}
            </h3>
            {canEdit && (
              <Link
                href={`/tasks/${task.id}/edit`}
                title="Aufgabe bearbeiten"
                className="text-gray-400 hover:text-blue-500 transition-colors shrink-0"
              >
                ✎
              </Link>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
          )}
        </div>

        {!isDone && (
          <div className="flex gap-2 shrink-0">
            {/* Zuweisen */}
            {!isAssigned && (
              isAdmin && users && users.length > 0 ? (
                // Admin: Nutzer-Auswahl + Scope-Buttons in einem Form
                <form action={claimTask} className="flex flex-col gap-1">
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="date" value={dateStr} />
                  <select
                    name="targetUserId"
                    defaultValue={userId}
                    className="text-xs border border-gray-200 rounded-md px-1 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                  {isOnce ? (
                    <button
                      type="submit"
                      name="scope"
                      value="always"
                      title="Aufgabe zuweisen"
                      className="h-9 px-2 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      👤 Zuweisen
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button
                        type="submit"
                        name="scope"
                        value="once"
                        title="Nur heute zuweisen"
                        className="h-9 px-2 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        👤 Heute
                      </button>
                      <button
                        type="submit"
                        name="scope"
                        value="always"
                        title="Dauerhaft zuweisen"
                        className="h-9 px-2 flex items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors whitespace-nowrap"
                      >
                        👤 Immer
                      </button>
                    </div>
                  )}
                </form>
              ) : isOnce ? (
                // Einmalige Aufgabe: ein Button reicht
                <form action={claimTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="date" value={dateStr} />
                  <input type="hidden" name="scope" value="always" />
                  <button
                    type="submit"
                    title="Aufgabe übernehmen"
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-lg hover:bg-blue-100 transition-colors"
                  >
                    👤
                  </button>
                </form>
              ) : (
                // Wiederkehrende Aufgabe: Heute oder Immer
                <div className="flex flex-col gap-1">
                  <form action={claimTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="date" value={dateStr} />
                    <input type="hidden" name="scope" value="once" />
                    <button
                      type="submit"
                      title="Nur heute übernehmen"
                      className="h-9 px-2 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      👤 Heute
                    </button>
                  </form>
                  <form action={claimTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="date" value={dateStr} />
                    <input type="hidden" name="scope" value="always" />
                    <button
                      type="submit"
                      title="Dauerhaft übernehmen"
                      className="h-9 px-2 flex items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-colors whitespace-nowrap"
                    >
                      👤 Immer
                    </button>
                  </form>
                </div>
              )
            )}

            {/* Zuweisung aufheben – nur wenn erlaubt */}
            {isAssigned && canUnclaim && (
              <form action={unclaimTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="date" value={dateStr} />
                <button
                  type="submit"
                  title={isAdmin && !isAssignedToMe ? "Zuweisung aufheben (Admin)" : "Aufgabe abgeben"}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 text-base hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </form>
            )}

            {/* Verschieben (vorerst nur einmalig) */}
            {!isSnoozedOccurrence && (
              <form action={snoozeTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="date" value={dateStr} />
                <button
                  type="submit"
                  title="Auf morgen verschieben"
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 text-lg hover:bg-amber-100 transition-colors"
                >
                  ↷
                </button>
              </form>
            )}

            {/* Erledigen */}
            <form action={markDone}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="date" value={dateStr} />
              <button
                type="submit"
                title="Als erledigt markieren"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-50 text-green-600 text-lg hover:bg-green-100 transition-colors"
              >
                ✓
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
