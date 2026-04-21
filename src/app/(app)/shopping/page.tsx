import { addShoppingItem, removeShoppingItem, restoreShoppingItem, updateShoppingItemTags } from "@/app/(app)/actions"
import ShoppingAddOverlay from "@/components/ShoppingAddOverlay"
import ShoppingTagEditor from "@/components/ShoppingTagEditor"
import { getRemovedShoppingItems, getShoppingItems, getShoppingSuggestions } from "@/lib/shopping"

export default async function ShoppingPage() {
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
      </section>

      <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h2 className="font-semibold mb-3">Aktuelle Liste ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Items in der Liste.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 px-3 py-3 bg-gray-50 flex items-start justify-between gap-3">
                <div>
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
                  <ShoppingTagEditor
                    itemId={item.id}
                    existingTags={item.tags.map((tag) => tag.value)}
                    quickTags={suggestions.tagsByItem[item.nameNormalized] ?? []}
                    action={updateShoppingItemTags}
                  />
                </div>
                <form action={removeShoppingItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Entfernen
                  </button>
                </form>
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
          <div className="space-y-2">
            {removedItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 px-3 py-3 bg-gray-50 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">{item.name}</p>
                <form action={restoreShoppingItem}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Erneut hinzufügen
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      <ShoppingAddOverlay
        action={addShoppingItem}
        nameSuggestions={suggestions.names}
        tagsByItem={suggestions.tagsByItem}
      />
    </div>
  )
}
