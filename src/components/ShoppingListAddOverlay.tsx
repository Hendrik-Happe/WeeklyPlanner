"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type UserOption = {
  id: string
  username: string
}

type Props = {
  action: (formData: FormData) => Promise<string>
  users: UserOption[]
}

export default function ShoppingListAddOverlay({ action, users }: Props) {
  const [open, setOpen] = useState(false)
  const [shareAll, setShareAll] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const listId = await action(formData)
      setOpen(false)
      router.push(`/shopping?list=${listId}`)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        + Liste erstellen
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label="Overlay schließen"
          />

          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-4 pb-6 max-h-[78vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Neue Liste anlegen</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  name="name"
                  required
                  placeholder="z.B. Geburtstag, Baumarkt, Urlaub"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isSharedWithAll"
                  value="true"
                  checked={shareAll}
                  onChange={(e) => setShareAll(e.target.checked)}
                />
                Mit allen Nutzern teilen
              </label>

              {!shareAll && users.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Mit ausgewählten Nutzern teilen</p>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="memberIds" value={user.id} />
                        {user.username}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold"
              >
                {pending ? "Liste wird erstellt..." : "Liste anlegen"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
