"use client"

import { useState, useTransition } from "react"
import RecipeForm from "@/components/RecipeForm"

type RecipeValues = {
  title: string
  description: string | null
  sourceType: string
  sourceText: string | null
  url: string | null
}

type Props = {
  recipeId: string
  initialValues: RecipeValues
  updateAction: (formData: FormData) => Promise<void>
  deleteAction: (formData: FormData) => Promise<void>
}

export default function RecipeManageOverlay({
  recipeId,
  initialValues,
  updateAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pendingDelete, startDeleteTransition] = useTransition()

  function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startDeleteTransition(async () => {
      await deleteAction(formData)
      setOpen(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-blue-700 hover:text-blue-900"
      >
        Bearbeiten
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
              <h3 className="font-semibold">Rezept bearbeiten</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            <div className="space-y-4">
              <RecipeForm
                action={updateAction}
                submitLabel="Änderungen speichern"
                submitPendingLabel="Speichern..."
                onSuccess={() => setOpen(false)}
                initialValues={initialValues}
              />

              <form onSubmit={handleDelete}>
                <input type="hidden" name="recipeId" value={recipeId} />
                <button
                  type="submit"
                  disabled={pendingDelete}
                  className="text-sm text-red-700 hover:text-red-800 disabled:opacity-60"
                >
                  {pendingDelete ? "Löschen..." : "Rezept löschen"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
