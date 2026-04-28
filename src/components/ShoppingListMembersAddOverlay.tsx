"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type UserOption = {
  id: string
  username: string
}

type Props = {
  addAction: (formData: FormData) => Promise<void>
  removeAction: (formData: FormData) => Promise<void>
  shareAllAction: (formData: FormData) => Promise<void>
  unshareAllAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
  listId: string
  users: UserOption[]
  members: UserOption[]
  isSharedWithAll: boolean
}

export default function ShoppingListMembersAddOverlay({
  addAction,
  removeAction,
  shareAllAction,
  unshareAllAction,
  deleteAction,
  listId,
  users,
  members,
  isSharedWithAll,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      await addAction(formData)
      setOpen(false)
      router.refresh()
    })
  }

  function handleRemove(memberId: string) {
    const formData = new FormData()
    formData.set("listId", listId)
    formData.set("memberId", memberId)

    startTransition(async () => {
      await removeAction(formData)
      router.refresh()
    })
  }

  function handleShareAll() {
    const formData = new FormData()
    formData.set("listId", listId)

    startTransition(async () => {
      await shareAllAction(formData)
      setOpen(false)
      router.refresh()
    })
  }

  function handleUnshareAll() {
    const formData = new FormData()
    formData.set("listId", listId)

    startTransition(async () => {
      await unshareAllAction(formData)
      setOpen(false)
      router.refresh()
    })
  }

  function handleDeleteList() {
    const shouldDelete = window.confirm("Liste wirklich löschen? Dieser Schritt kann nicht rückgängig gemacht werden.")
    if (!shouldDelete) return

    const formData = new FormData()
    formData.set("listId", listId)

    startTransition(async () => {
      await deleteAction(formData)
      setOpen(false)
      router.push("/shopping")
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Freigabe verwalten
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
              <h3 className="font-semibold text-sm">Freigabe verwalten</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="hidden" name="listId" value={listId} />

              {isSharedWithAll ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Diese Liste ist aktuell für alle Nutzer freigegeben.
                  </p>
                  <button
                    type="button"
                    onClick={handleUnshareAll}
                    disabled={pending}
                    className="w-full rounded-lg border border-orange-200 bg-orange-50 text-orange-800 py-2.5 text-sm font-semibold hover:bg-orange-100 disabled:opacity-60"
                  >
                    Freigabe für alle rückgängig machen
                  </button>
                </div>
              ) : (
                <>

                  <div>
                    <p className="text-sm font-medium mb-1">Aktuelle Nutzer</p>
                    {members.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between gap-2 text-sm">
                            <span>{member.username}</span>
                            <button
                              type="button"
                              onClick={() => handleRemove(member.id)}
                              disabled={pending}
                              className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              Entfernen
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Keine einzelnen Nutzer zugewiesen.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleShareAll}
                    disabled={pending}
                    className="w-full rounded-lg border border-blue-200 bg-blue-50 text-blue-800 py-2.5 text-sm font-semibold hover:bg-blue-100 disabled:opacity-60"
                  >
                    Für alle Nutzer freigeben
                  </button>

                  {users.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-1">Verfügbare Nutzer</p>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                        {users.map((user) => (
                          <label key={user.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="memberIds" value={user.id} />
                            {user.username}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Es sind keine weiteren Nutzer verfügbar.</p>
                  )}

                  <button
                    type="submit"
                    disabled={pending || users.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold"
                  >
                    {pending ? "Nutzer werden hinzugefügt..." : "Nutzer hinzufügen"}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleDeleteList}
                disabled={pending}
                className="w-full rounded-lg border border-red-200 bg-red-50 text-red-800 py-2.5 text-sm font-semibold hover:bg-red-100 disabled:opacity-60"
              >
                Liste löschen
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
