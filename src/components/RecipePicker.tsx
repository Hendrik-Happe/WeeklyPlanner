"use client"

import { useMemo, useState } from "react"

type RecipeOption = {
  id: string
  title: string
}

type Props = {
  recipes: RecipeOption[]
  defaultRecipeId?: string
  name?: string
  compact?: boolean
}

export default function RecipePicker({
  recipes,
  defaultRecipeId,
  name = "recipeId",
  compact = false,
}: Props) {
  const [query, setQuery] = useState("")

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
      <select
        name={name}
        defaultValue={defaultRecipeId ?? ""}
        required
        className={`w-full border border-rose-200 rounded-lg ${compact ? "px-2.5 py-2 text-sm" : "px-3 py-2 text-sm"} bg-white focus:outline-none focus:ring-2 focus:ring-rose-300`}
      >
        <option value="" disabled>
          Rezept waehlen
        </option>
        {filtered.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>
            {recipe.title}
          </option>
        ))}
      </select>
    </div>
  )
}
