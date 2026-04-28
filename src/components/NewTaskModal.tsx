"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import NewTaskForm from "@/components/NewTaskForm"

type User = { id: string; username: string }

type Props = {
  action: (formData: FormData) => Promise<void>
  users: User[]
  isAdmin: boolean
  buttonLabel?: string
}

export default function NewTaskModal({
  action,
  users,
  isAdmin,
  buttonLabel = "Neue Aufgabe",
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label="Overlay schließen"
          />

          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-4 pb-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Neue Aufgabe</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            {pending && (
              <p className="mb-2 text-xs text-gray-500">Wird gespeichert...</p>
            )}

            <NewTaskForm
              action={handleSubmit}
              users={users}
              isAdmin={isAdmin}
              submitLabel={pending ? "Speichert..." : "Aufgabe erstellen"}
            />
          </div>
        </div>
      )}
    </>
  )
}
