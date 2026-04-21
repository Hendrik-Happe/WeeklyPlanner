import { createRecipe } from "@/app/(app)/actions"
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

export default async function MealsPage() {
  const today = getTodayInBerlin()
  const upcomingDays = nextDays(today, 7)
  const dates = upcomingDays.map((day) => formatDate(day))
  const [recipes, mealPlans] = await Promise.all([
    getRecipes(),
    getMealPlansForDates(dates),
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
            {recipes.map((recipe) => (
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
