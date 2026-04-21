import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addShoppingItem, removeShoppingItem, restoreShoppingItem, setShoppingView, updateShoppingItemTags } from "@/app/(app)/actions"
import ShoppingAddOverlay from "@/components/ShoppingAddOverlay"
import ShoppingTagEditor from "@/components/ShoppingTagEditor"
import { getRemovedShoppingItems, getShoppingItems, getShoppingSuggestions } from "@/lib/shopping"

export default async function ShoppingPage() {
  const session = await auth()
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { shoppingView: true },
  })
  const isGridView = user?.shoppingView === "GRID"

  const [items, removedItems, suggestions] = await Promise.all([
    getShoppingItems(),
    getRemovedShoppingItems(),
    getShoppingSuggestions(),
  ])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28 space-y-6">
      <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h1 className="text-xl font-bold mb-1">Einkaufsliste</h1>
        <p className="text-sm text-gray-500">Items mit optionalen Tags wie Menge, Farbe oder Qualität.</p>
        <div className="mt-3 inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <form action={setShoppingView}>
            <input type="hidden" name="view" value="LIST" />
            <button
              type="submit"
              className={`px-3 py-1.5 text-sm font-medium ${
                !isGridView ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Liste
            </button>
          </form>
          <form action={setShoppingView}>
            <input type="hidden" name="view" value="GRID" />
            <button
              type="submit"
              className={`px-3 py-1.5 text-sm font-medium ${
                isGridView ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Kacheln
            </button>
          </form>
        </div>
      </section>

      <ShoppingAddOverlay
        action={addShoppingItem}
        nameSuggestions={suggestions.names}
        tagsByItem={suggestions.tagsByItem}
      />

      <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h2 className="font-semibold mb-3">Aktuelle Liste ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Items in der Liste.</p>
        ) : (
          <div className={isGridView ? "grid grid-cols-2 sm:grid-cols-3 gap-2" : "space-y-2"}>
            {items.map((item) => (
              <div key={item.id} className="relative rounded-xl border border-gray-100 px-3 py-3 bg-gray-50">
                <form action={removeShoppingItem} className="absolute inset-0">
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    aria-label={`${item.name} entfernen`}
                    className="w-full h-full cursor-pointer"
                  />
                </form>
                <div className="relative pointer-events-none">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag.id} className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 border border-blue-100">
                        {tag.value}
                      </span>
                    ))}
                    {item.tags.length === 0 && (
                      <span className="text-xs text-gray-400">Keine Tags</span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <ShoppingTagEditor
                    itemId={item.id}
                    existingTags={item.tags.map((tag) => tag.value)}
                    quickTags={suggestions.tagsByItem[item.nameNormalized] ?? []}
                    action={updateShoppingItemTags}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h2 className="font-semibold mb-3">Entfernte Items ({removedItems.length})</h2>
        {removedItems.length === 0 ? (
          <p className="text-sm text-gray-400">Keine entfernten Items.</p>
        ) : (
          <div className={isGridView ? "grid grid-cols-2 sm:grid-cols-3 gap-2" : "space-y-2"}>
            {removedItems.map((item) => (
              <form key={item.id} action={restoreShoppingItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  className="w-full text-left rounded-xl border border-gray-100 px-3 py-3 bg-gray-50 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <p className="text-sm text-gray-600 line-through">{item.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag.id} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 border border-gray-200">
                        {tag.value}
                      </span>
                    ))}
                  </div>
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
