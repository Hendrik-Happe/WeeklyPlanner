"use client"

import { useMemo, useState } from "react"

type Props = {
  itemId: string
  existingTags: string[]
  quickTags: string[]
  action: (formData: FormData) => Promise<void>
}

export default function ShoppingTagEditor({ itemId, existingTags, quickTags, action }: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>(existingTags)

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
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="itemId" value={itemId} />

      {quickTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...selectedTags, ...suggested].map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
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
      )}

      {selectedTags.map((tag) => (
        <input key={tag} type="hidden" name="selectedTags" value={tag} />
      ))}

      <input
        name="tags"
        defaultValue={selectedTags.join(", ")}
        placeholder="Weitere Tags, z.B. Rot, 4, Bio"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        type="submit"
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        Tags speichern
      </button>
    </form>
  )
}
