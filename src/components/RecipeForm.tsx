"use client"

import { useState } from "react"

type Props = {
  action: (formData: FormData) => Promise<void>
}

export default function RecipeForm({ action }: Props) {
  const [sourceType, setSourceType] = useState("APP")

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Rezeptname</label>
        <input
          name="title"
          required
          placeholder="z.B. Lasagne"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quelle</label>
        <select
          name="sourceType"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="APP">In der App</option>
          <option value="BOOK">Aus einem Buch</option>
          <option value="LINK">Link</option>
        </select>
      </div>

      {sourceType === "BOOK" && (
        <div>
          <label className="block text-sm font-medium mb-1">Buch / Seite</label>
          <input
            name="sourceText"
            required
            placeholder="z.B. Familienkochbuch S. 42"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {sourceType === "LINK" && (
        <div>
          <label className="block text-sm font-medium mb-1">Link</label>
          <input
            type="url"
            name="url"
            required
            placeholder="https://..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          {sourceType === "APP" ? "Zubereitung / Notizen" : "Notizen"}
        </label>
        <textarea
          name="description"
          rows={4}
          placeholder={sourceType === "APP" ? "Zutaten, Schritte, Hinweise..." : "Optional..."}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold text-base transition-colors"
      >
        Rezept speichern
      </button>
    </form>
  )
}
