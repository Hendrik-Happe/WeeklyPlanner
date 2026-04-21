"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { clearMealPlan, setMealPlan } from "@/app/(app)/actions"
import RecipePicker from "@/components/RecipePicker"

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
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSetMealPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    if (submitter?.name) formData.set(submitter.name, submitter.value)
    startTransition(async () => {
      await setMealPlan(formData)
      setOpen(false)
    })
  }

  function handleClearMealPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await clearMealPlan(formData)
      setOpen(false)
    })
  }

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

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm text-rose-700 hover:text-rose-800"
      >
          {mealPlan ? "Rezept ändern" : "Rezept auswählen"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label="Overlay schließen"
          />

          <div className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-4 pb-6 max-h-[78vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                {mealPlan ? "Rezept ändern" : "Rezept auswählen"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            <div className="space-y-3">
              <form onSubmit={handleSetMealPlan} className="flex gap-2">
                <input type="hidden" name="date" value={dateStr} />
                <RecipePicker recipes={recipes} defaultRecipeId={mealPlan?.recipe.id} submitOnSelect />
              </form>

              {mealPlan && (
                <form onSubmit={handleClearMealPlan}>
                  <input type="hidden" name="date" value={dateStr} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-60"
                  >
                    Rezept für diesen Tag entfernen
                  </button>
                </form>
              )}

              <Link href="/meals" className="inline-block text-sm text-blue-600 hover:text-blue-700">
                Rezepte verwalten
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
