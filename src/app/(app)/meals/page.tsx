import { createRecipe, deleteRecipe, updateRecipe } from "@/app/(app)/actions"
import MealWeekGrid from "@/components/MealWeekGrid"
import RecipeForm from "@/components/RecipeForm"
import { getMealPlansForDates, getRecipes } from "@/lib/meals"
import { formatDate, getTodayInBerlin } from "@/lib/tasks"

function nextDays(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

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
  const upcomingDays = nextDays(today, 7)
  const dates = upcomingDays.map((day) => formatDate(day))
  const [recipes, mealPlans, mealPlansForWeek] = await Promise.all([
    getRecipes(),
    getMealPlansForDates(dates),
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

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Rezept hinzufügen</h2>
        <RecipeForm action={createRecipe} />
      </section>

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
        <h2 className="text-lg font-semibold mb-4">Nächste 7 Tage</h2>
        <div className="space-y-3">
          {upcomingDays.map((day) => {
            const dateStr = formatDate(day)
            const meal = mealPlans.get(dateStr)
            return (
              <div key={dateStr} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3 bg-gray-50">
                <div>
                  <p className="font-medium text-sm">
                    {day.toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "Europe/Berlin",
                    })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {meal ? meal.recipe.title : "Noch kein Rezept geplant"}
                  </p>
                </div>
                <a href={dateStr === formatDate(today) ? "/day" : "/week"} className="text-sm text-blue-600 hover:text-blue-700">
                  Öffnen
                </a>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Rezepte</h2>
        {recipes.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Rezepte gespeichert.</p>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe: (typeof recipes)[number]) => (
              <div key={recipe.id} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {recipe.sourceType === "APP"
                        ? "In der App"
                        : recipe.sourceType === "BOOK"
                        ? recipe.sourceText
                        : recipe.url}
                    </p>
                    {recipe.description && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{recipe.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">von {recipe.createdBy.username}</p>
                </div>

                <details className="mt-3">
                  <summary className="text-sm text-blue-600 cursor-pointer select-none">
                    Rezept bearbeiten
                  </summary>
                  <div className="mt-3 space-y-3">
                    <RecipeForm
                      action={updateRecipe.bind(null, recipe.id)}
                      submitLabel="Änderungen speichern"
                      initialValues={{
                        title: recipe.title,
                        description: recipe.description,
                        sourceType: recipe.sourceType,
                        sourceText: recipe.sourceText,
                        url: recipe.url,
                      }}
                    />
                    <form action={deleteRecipe}>
                      <input type="hidden" name="recipeId" value={recipe.id} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Rezept löschen
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
