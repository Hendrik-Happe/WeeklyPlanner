"use client"

import { useMemo, useState } from "react"

type RecipeOption = {
  id: string
  title: string
}

type Props = {
  recipes: RecipeOption[]
  defaultRecipeId?: string
  selectedRecipeIds?: string[]
  name?: string
  compact?: boolean
  submitOnSelect?: boolean
  listMaxHeightClass?: string
}

export default function RecipePicker({
  recipes,
  defaultRecipeId,
  selectedRecipeIds,
  name = "recipeId",
  compact = false,
  submitOnSelect = false,
  listMaxHeightClass,
}: Props) {
  const [query, setQuery] = useState("")
  const [selectedRecipeId, setSelectedRecipeId] = useState(defaultRecipeId ?? "")

  // prefer selectedRecipeIds array if provided
  const alreadySelected = selectedRecipeIds ?? (defaultRecipeId ? [defaultRecipeId] : [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((recipe) => recipe.title.toLowerCase().includes(q))
  }, [recipes, query])

  return (
    <div className="space-y-2 flex-1">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rezept suchen..."
        className={`w-full border border-rose-200 rounded-lg ${compact ? "px-2.5 py-2 text-sm" : "px-3 py-2 text-sm"} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300`}
      />
      {!submitOnSelect && (
        <input
          type="text"
          name={name}
          value={selectedRecipeId}
          required
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-gray-500">Keine Rezepte gefunden.</p>
      ) : (
        <div
          className={`grid ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"} gap-2 ${listMaxHeightClass ?? "max-h-44"} overflow-y-auto pr-1`}
        >
          {filtered.map((recipe) => {
            const active = selectedRecipeId === recipe.id
            const alreadyAdded = alreadySelected.includes(recipe.id)
            return (
              <button
                key={recipe.id}
                type={submitOnSelect ? "submit" : "button"}
                onClick={() => setSelectedRecipeId(recipe.id)}
                name={submitOnSelect ? name : undefined}
                value={submitOnSelect ? recipe.id : undefined}
                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                  compact ? "text-xs" : "text-sm"
                } ${
                  active
                    ? "bg-rose-500 border-rose-500 text-white"
                    : alreadyAdded
                    ? "bg-rose-100 border-rose-300 text-rose-700"
                    : "bg-white border-rose-200 text-gray-700 hover:border-rose-300"
                }`}
              >
                {recipe.title}
                {alreadyAdded && !active && (
                  <span className="ml-1 text-xs opacity-70">✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
