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
      <input
        type="text"
        readOnly
        placeholder="+ Item hinzufügen…"
        onFocus={(e) => {
          e.currentTarget.blur()
          setOpen(true)
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base placeholder-gray-400 cursor-pointer focus:outline-none"
      />

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
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
