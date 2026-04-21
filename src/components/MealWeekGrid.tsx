import Link from "next/link"
import { clearMealPlan, setMealPlan } from "@/app/(app)/actions"

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

              <form action={setMealPlan} className="space-y-2">
                <input type="hidden" name="date" value={dateStr} />
                <select
                  name="recipeId"
                  defaultValue={meal?.recipe.id ?? ""}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  <option value="" disabled>
                    Rezept waehlen
                  </option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-rose-500 text-white py-2 text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  Speichern
                </button>
              </form>

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
