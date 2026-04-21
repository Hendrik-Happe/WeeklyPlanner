"use client"

import { useState } from "react"
import ShoppingItemForm from "@/components/ShoppingItemForm"

type Props = {
  action: (formData: FormData) => Promise<void>
  nameSuggestions: string[]
  tagsByItem: Record<string, string[]>
}

export default function ShoppingAddOverlay({ action, nameSuggestions, tagsByItem }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-[60] rounded-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 text-sm font-semibold shadow-lg"
        >
          + Item hinzufügen
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Overlay schließen"
            className="absolute inset-0 bg-black/35"
          />
          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-4 pb-6 max-h-[78vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Neues Item</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>
            <ShoppingItemForm
              action={action}
              nameSuggestions={nameSuggestions}
              tagsByItem={tagsByItem}
            />
          </div>
        </div>
      )}
    </>
  )
}
