"use client"

import { useState } from "react"
import RecipeForm from "@/components/RecipeForm"

type Props = {
  action: (formData: FormData) => Promise<void>
}

export default function RecipeAddOverlay({ action }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-2">Rezept hinzufügen</h2>
      <input
        type="text"
        readOnly
        placeholder="+ Neues Rezept anlegen..."
        onFocus={(e) => {
          e.currentTarget.blur()
          setOpen(true)
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base placeholder-gray-400 cursor-pointer focus:outline-none"
      />

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
              <h3 className="font-semibold">Neues Rezept</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            <RecipeForm
              action={action}
              onSuccess={() => setOpen(false)}
              submitPendingLabel="Speichern..."
            />
          </div>
        </div>
      )}
    </section>
  )
}
