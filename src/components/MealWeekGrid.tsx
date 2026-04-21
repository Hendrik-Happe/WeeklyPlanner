import Link from "next/link"
import { clearMealPlan } from "@/app/(app)/actions"
import MealWeekPickerOverlay from "@/components/MealWeekPickerOverlay"

type Recipe = {
  id: string
  title: string
}

type MealPlanEntry = {
  date: string
  recipe: {
    id: string
    title: string
  }
}

type Props = {
  days: { date: Date; dateStr: string; isToday: boolean }[]
  recipes: Recipe[]
  mealPlans: Map<string, MealPlanEntry>
  weekOffset: number
}

export default function MealWeekGrid({ days, recipes, mealPlans, weekOffset }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Essenswoche</h2>
          <p className="text-sm text-gray-500">Kompakte Wochenansicht nur fuer Mahlzeiten.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/meals?week=${weekOffset - 1}`}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            ←
          </Link>
          <Link
            href="/meals?week=0"
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            Heute
          </Link>
          <Link
            href={`/meals?week=${weekOffset + 1}`}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
        {days.map(({ date, dateStr, isToday }) => {
          const meal = mealPlans.get(dateStr)
          return (
            <div
              key={dateStr}
              className={`rounded-2xl border p-3 ${isToday ? "border-rose-300 bg-rose-50" : "border-gray-100 bg-white"}`}
            >
              <div className="mb-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {date.toLocaleDateString("de-DE", { weekday: "short", timeZone: "Europe/Berlin" })}
                </p>
                <p className="font-semibold text-sm text-gray-900 mt-1">
                  {date.toLocaleDateString("de-DE", {
                    day: "numeric",
                    month: "numeric",
                    timeZone: "Europe/Berlin",
                  })}
                </p>
              </div>

              <div className="min-h-12 mb-3">
                {meal ? (
                  <p className="text-sm font-medium text-gray-800">{meal.recipe.title}</p>
                ) : (
                  <p className="text-sm text-gray-400">Noch nichts geplant</p>
                )}
              </div>

              <MealWeekPickerOverlay
                dateStr={dateStr}
                dateLabel={date.toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Berlin",
                })}
                recipes={recipes}
                defaultRecipeId={meal?.recipe.id}
              />

              {meal && (
                <form action={clearMealPlan} className="mt-2">
                  <input type="hidden" name="date" value={dateStr} />
                  <button type="submit" className="text-xs text-gray-500 hover:text-gray-700">
                    Entfernen
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
