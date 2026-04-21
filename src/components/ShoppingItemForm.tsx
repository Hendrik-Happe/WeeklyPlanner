"use client"

import { useMemo, useState } from "react"

type Props = {
  action: (formData: FormData) => Promise<void>
  nameSuggestions: string[]
  tagsByItem: Record<string, string[]>
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function parseTagsText(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
}

export default function ShoppingItemForm({ action, nameSuggestions, tagsByItem }: Props) {
  const [name, setName] = useState("")
  const [tagsText, setTagsText] = useState("")

  const availableTags = useMemo(() => {
    const key = normalize(name)
    return tagsByItem[key] ?? []
  }, [name, tagsByItem])

  const activeLower = new Set(parseTagsText(tagsText))

  function toggleTag(tag: string) {
    const lower = tag.trim().toLowerCase()
    if (activeLower.has(lower)) {
      const parts = tagsText.split(/[,;\n]/).map((v) => v.trim()).filter(Boolean)
      const next = parts.filter((p) => p.toLowerCase() !== lower)
      setTagsText(next.join(", "))
    } else {
      const base = tagsText.trim().replace(/[,;\s]+$/, "")
      setTagsText(base ? base + ", " + tag : tag)
    }
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Item</label>
        <input
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setTagsText("")
          }}
          list="shopping-item-suggestions"
          required
          placeholder="z.B. Paprika"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="shopping-item-suggestions">
          {nameSuggestions.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
      </div>

      {availableTags.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Tags aus früheren Einträgen</p>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const active = activeLower.has(tag.toLowerCase())
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full border text-sm transition-colors ${
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

      <div>
        <label className="block text-sm font-medium mb-1">Tags (optional, kommagetrennt)</label>
        <input
          name="tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="z.B. Rot, 4, Bio"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold text-base transition-colors"
      >
        Zur Einkaufsliste hinzufügen
      </button>
    </form>
  )
}
