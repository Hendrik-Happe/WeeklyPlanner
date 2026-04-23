"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { setMealPlan } from "@/app/(app)/actions"
import RecipePicker from "@/components/RecipePicker"

type Recipe = {
  id: string
  title: string
}

type Props = {
  dateStr: string
  dateLabel?: string
  recipes: Recipe[]
  selectedRecipeIds?: string[]
  triggerClassName?: string
  triggerLabel?: string
  showManageLink?: boolean
}

export default function MealWeekPickerOverlay({
  dateStr,
  dateLabel,
  recipes,
  selectedRecipeIds = [],
  triggerClassName,
  triggerLabel,
  showManageLink = false,
}: Props) {
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
      // keep overlay open so user can add more recipes
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "w-full rounded-lg border border-rose-200 bg-white text-rose-700 py-2 text-sm font-medium hover:bg-rose-50 transition-colors"
        }
      >
        {triggerLabel ?? "Rezept hinzufügen"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35"
            aria-label="Overlay schließen"
          />

          <div className="absolute top-3 bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 p-4 pb-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm">Rezept hinzufügen</h3>
                {dateLabel && <p className="text-xs text-gray-500 mt-0.5">{dateLabel}</p>}
                {selectedRecipeIds.length > 0 && (
                  <p className="text-xs text-rose-600 mt-0.5">
                    {selectedRecipeIds.length} Rezept{selectedRecipeIds.length !== 1 ? "e" : ""} bereits geplant
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schließen
              </button>
            </div>

            <form onSubmit={handleSetMealPlan} className={pending ? "opacity-70 pointer-events-none" : ""}>
              <input type="hidden" name="date" value={dateStr} />
              <RecipePicker
                recipes={recipes}
                selectedRecipeIds={selectedRecipeIds}
                submitOnSelect
                listMaxHeightClass="max-h-[58vh]"
              />
            </form>

            {showManageLink && (
              <div className="mt-4">
                <Link href="/meals" className="inline-block text-sm text-blue-600 hover:text-blue-700">
                  Rezepte verwalten
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
