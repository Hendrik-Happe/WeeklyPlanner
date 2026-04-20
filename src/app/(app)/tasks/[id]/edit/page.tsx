import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { updateTask } from "@/app/(app)/actions"
import NewTaskForm from "@/components/NewTaskForm"
import { formatDate } from "@/lib/tasks"

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      recurrence: true,
      assignedTo: { select: { id: true, username: true } },
    },
  })

  if (!task) notFound()

  const isOwner = task.createdById === session!.user.id
  const isAdmin = session!.user.role === "ADMIN"
  const canEdit = isOwner || (isAdmin && !task.isPrivate)

  if (!canEdit) redirect("/my-tasks")

  const users = isAdmin
    ? await prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } })
    : []

  const r = task.recurrence

  async function handleUpdate(formData: FormData) {
    "use server"
    await updateTask(id, formData)
    redirect("/my-tasks")
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Aufgabe bearbeiten</h1>
      <NewTaskForm
        action={handleUpdate}
        users={users}
        isAdmin={isAdmin}
        submitLabel="Änderungen speichern"
        initialValues={{
          title: task.title,
          description: task.description ?? "",
          assignedToId: task.assignedToId,
          isPrivate: task.isPrivate,
          recurrenceType: r?.type ?? "ONCE",
          interval: r?.interval ?? 1,
          weekdays: r?.weekdays ? JSON.parse(r.weekdays) : [],
          monthFrom: r?.monthFrom ?? null,
          monthTo: r?.monthTo ?? null,
          validFrom: r?.validFrom ? formatDate(new Date(r.validFrom)) : null,
          validUntil: r?.validUntil ? formatDate(new Date(r.validUntil)) : null,
        }}
      />
    </div>
  )
}
