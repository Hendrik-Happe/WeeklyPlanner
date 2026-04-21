"use client"

import Link from "next/link"
import MealWeekPickerOverlay from "@/components/MealWeekPickerOverlay"

type RecipeOption = {
  id: string
  title: string
  sourceType: string
}

type MealPlan = {
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
  mealPlan: MealPlan | null
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

export default function MealPlanCard({ dateStr, mealPlan, recipes, compact = false }: Props) {
  return (
    <div className={`rounded-xl border ${compact ? "p-3" : "p-4"} bg-rose-50 border-rose-100`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Essensplan</p>
          {mealPlan ? (
            <>
              <h3 className="font-semibold text-gray-900 mt-1">{mealPlan.recipe.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{sourceLabel(mealPlan)}</p>
              {mealPlan.recipe.description && !compact && (
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{mealPlan.recipe.description}</p>
              )}
              {mealPlan.recipe.url && (
                <Link
                  href={mealPlan.recipe.url}
                  target="_blank"
                  className="inline-block text-sm text-blue-600 hover:text-blue-700 mt-2"
                >
                  Rezept öffnen
                </Link>
              )}
              {!compact && (
                <p className="text-xs text-gray-400 mt-2">
                  Eingetragen von {mealPlan.assignedBy.username}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Noch kein Rezept ausgewählt.</p>
          )}
        </div>
      </div>

      <MealWeekPickerOverlay
        dateStr={dateStr}
        recipes={recipes}
        defaultRecipeId={mealPlan?.recipe.id}
        triggerClassName="mt-3 text-sm text-rose-700 hover:text-rose-800"
        showClearAction
        showManageLink
      />
    </div>
  )
}
