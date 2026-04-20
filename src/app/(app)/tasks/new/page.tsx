import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createTask } from "@/app/(app)/actions"
import { redirect } from "next/navigation"
import NewTaskForm from "@/components/NewTaskForm"

export default async function NewTaskPage() {
  const session = await auth()
  const isAdmin = session?.user.role === "ADMIN"

  const users = isAdmin
    ? await prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } })
    : []

  async function handleCreate(formData: FormData) {
    "use server"
    await createTask(formData)
    redirect("/my-tasks")
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Aufgabe anlegen</h1>
      <NewTaskForm action={handleCreate} users={users} isAdmin={isAdmin} />
    </div>
  )
}
