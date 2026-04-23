"use client"

import Link from "next/link"
import { removeMealPlanEntry } from "@/app/(app)/actions"
import MealWeekPickerOverlay from "@/components/MealWeekPickerOverlay"

type RecipeOption = {
  id: string
  title: string
  sourceType: string
}

type MealPlan = {
  id: string
  date: string
  recipe: {
    id: string
    title: string
    description: string | null
    sourceType: string
    sourceText: string | null
    url: string | null
    createdBy: { username: string }
  }
  assignedBy: { username: string }
}

type Props = {
  dateStr: string
  mealPlans: MealPlan[]
  recipes: RecipeOption[]
  compact?: boolean
}

function sourceLabel(mealPlan: MealPlan) {
  switch (mealPlan.recipe.sourceType) {
    case "BOOK":
      return mealPlan.recipe.sourceText ?? "Buch"
    case "LINK":
      return mealPlan.recipe.url ?? "Link"
    default:
      return "In der App"
  }
}

export default function MealPlanCard({ dateStr, mealPlans, recipes, compact = false }: Props) {
  return (
    <div className={`rounded-xl border ${compact ? "p-3" : "p-4"} bg-rose-50 border-rose-100`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Essensplan</p>

      {mealPlans.length === 0 ? (
        <p className="text-sm text-gray-500 mt-1">Noch kein Rezept ausgewählt.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {mealPlans.map((mealPlan) => (
            <li key={mealPlan.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{mealPlan.recipe.title}</p>
                {!compact && <p className="text-xs text-gray-500">{sourceLabel(mealPlan)}</p>}
                {mealPlan.recipe.description && !compact && (
                  <details className="mt-1">
                    <summary className="text-xs text-rose-700 cursor-pointer select-none">
                      Beschreibung
                    </summary>
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{mealPlan.recipe.description}</p>
                  </details>
                )}
                {mealPlan.recipe.url && (
                  <Link
                    href={mealPlan.recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Rezept öffnen
                  </Link>
                )}
                {!compact && (
                  <p className="text-xs text-gray-400 mt-1">
                    Eingetragen von {mealPlan.assignedBy.username}
                  </p>
                )}
              </div>
              <form action={removeMealPlanEntry} className="shrink-0">
                <input type="hidden" name="date" value={dateStr} />
                <input type="hidden" name="recipeId" value={mealPlan.recipe.id} />
                <button
                  type="submit"
                  title="Entfernen"
                  className="text-xs text-gray-400 hover:text-rose-600 mt-0.5"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <MealWeekPickerOverlay
        dateStr={dateStr}
        recipes={recipes}
        selectedRecipeIds={mealPlans.map((m) => m.recipe.id)}
        triggerClassName="mt-3 text-sm text-rose-700 hover:text-rose-800"
        showManageLink
      />
    </div>
  )
}
