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
  searchParams: Promise<{ week?: string }>
}) {
  const { week: weekParam } = await searchParams
  const weekOffset = parseInt(weekParam ?? "0", 10) || 0
  const today = getTodayInBerlin()
  const baseDate = new Date(today)
  baseDate.setDate(today.getDate() + weekOffset * 7)
  const weekDays = getWeekDays(baseDate)
  const weekDates = weekDays.map((day) => formatDate(day))
  const [recipes, mealPlansForWeek] = await Promise.all([
    getRecipes(),
    getMealPlansForDates(weekDates),
  ])

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
            Rezepte verwalten ({recipes.length})
          </summary>
          <div className="mt-4 space-y-2">
            {recipes.length === 0 ? (
              <p className="text-sm text-gray-400">Noch keine Rezepte gespeichert.</p>
            ) : (
              recipes.map((recipe: (typeof recipes)[number]) => (
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
