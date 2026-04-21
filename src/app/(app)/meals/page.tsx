import { createRecipe, deleteRecipe, updateRecipe } from "@/app/(app)/actions"
import MealWeekGrid from "@/components/MealWeekGrid"
import RecipeAddOverlay from "@/components/RecipeAddOverlay"
import RecipeManageOverlay from "@/components/RecipeManageOverlay"
import { getMealPlansForDates, getRecipes } from "@/lib/meals"
import { formatDate, getTodayInBerlin } from "@/lib/tasks"

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; recipeQ?: string; recipeSource?: string }>
}) {
  const { week: weekParam, recipeQ: recipeQParam, recipeSource: recipeSourceParam } = await searchParams
  const weekOffset = parseInt(weekParam ?? "0", 10) || 0
  const recipeQ = (recipeQParam ?? "").trim()
  const recipeSource = recipeSourceParam ?? ""
  const today = getTodayInBerlin()
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDays = getWeekDays(baseDate)
  const weekDates = weekDays.map((day) => formatDate(day))
  const [recipes, mealPlansForWeek] = await Promise.all([
    getRecipes(),
    getMealPlansForDates(weekDates),
  ])

  const filteredRecipes = recipes
    .filter((recipe) => {
      if (recipeSource && recipe.sourceType !== recipeSource) return false
      if (!recipeQ) return true

      const q = recipeQ.toLowerCase()
      return (
        recipe.title.toLowerCase().includes(q) ||
        (recipe.description ?? "").toLowerCase().includes(q) ||
        (recipe.sourceText ?? "").toLowerCase().includes(q) ||
        (recipe.url ?? "").toLowerCase().includes(q)
      )
    })
    .sort((a, b) => a.title.localeCompare(b.title, "de"))

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <h1 className="text-xl font-bold">Essensplan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Rezepte anlegen und für einzelne Tage im Familienplan verwenden.
        </p>
      </section>

      <RecipeAddOverlay action={createRecipe} />

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <MealWeekGrid
          weekOffset={weekOffset}
          days={weekDays.map((date) => ({
            date,
            dateStr: formatDate(date),
            isToday: formatDate(date) === formatDate(today),
          }))}
          recipes={recipes}
          mealPlans={mealPlansForWeek}
        />
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <details>
          <summary className="text-lg font-semibold cursor-pointer select-none">
            Rezepte verwalten ({filteredRecipes.length}/{recipes.length})
          </summary>
          <div className="mt-4 space-y-2">
            <form className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 mb-3">
              {weekOffset !== 0 && <input type="hidden" name="week" value={String(weekOffset)} />}
              <input
                type="text"
                name="recipeQ"
                defaultValue={recipeQ}
                placeholder="Rezept suchen..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="recipeSource"
                defaultValue={recipeSource}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Quellen</option>
                <option value="APP">In der App</option>
                <option value="BOOK">Buch</option>
                <option value="LINK">Link</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Filtern
                </button>
                {(recipeQ || recipeSource) && (
                  <a
                    href={weekOffset === 0 ? "/meals" : `/meals?week=${weekOffset}`}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </a>
                )}
              </div>
            </form>

            {filteredRecipes.length === 0 ? (
              <p className="text-sm text-gray-400">Noch keine Rezepte gespeichert.</p>
            ) : (
              filteredRecipes.map((recipe: (typeof recipes)[number]) => (
                <div key={recipe.id} className="rounded-xl border border-gray-100 px-3 py-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{recipe.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {recipe.sourceType === "APP"
                          ? "In der App"
                          : recipe.sourceType === "BOOK"
                          ? recipe.sourceText
                          : recipe.url}
                      </p>
                    </div>
                    <RecipeManageOverlay
                      recipeId={recipe.id}
                      updateAction={updateRecipe.bind(null, recipe.id)}
                      deleteAction={deleteRecipe}
                      initialValues={{
                        title: recipe.title,
                        description: recipe.description,
                        sourceType: recipe.sourceType,
                        sourceText: recipe.sourceText,
                        url: recipe.url,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      </section>
    </div>
  )
}
