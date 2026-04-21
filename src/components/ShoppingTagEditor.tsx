"use client"

import { useMemo, useState, useTransition } from "react"

type Props = {
  itemId: string
  existingTags: string[]
  quickTags: string[]
  action: (formData: FormData) => Promise<void>
}

export default function ShoppingTagEditor({ itemId, existingTags, quickTags, action }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(existingTags)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await action(formData)
      setOpen(false)
    })
  }

  const suggested = useMemo(
    () => quickTags.filter((tag) => !selectedTags.includes(tag)),
    [quickTags, selectedTags]
  )

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-blue-600 hover:text-blue-700"
      >
        Tags bearbeiten
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label="Tag-Editor schließen"
          />

          <form onSubmit={handleSubmit} className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-4 pb-6 max-h-[75vh] overflow-y-auto space-y-3">
            <input type="hidden" name="itemId" value={itemId} />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Tags bearbeiten</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            {quickTags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Schnellauswahl</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...selectedTags, ...suggested].map((tag) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs rounded-full px-2 py-1 border transition-colors ${
                          active
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedTags.map((tag) => (
              <input key={tag} type="hidden" name="selectedTags" value={tag} />
            ))}

            <div>
              <label className="block text-sm font-medium mb-1">Weitere Tags</label>
              <input
                name="tags"
                placeholder="z.B. Rot, 4, Bio"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold"
            >
              {pending ? "Speichern…" : "Tags speichern"}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
