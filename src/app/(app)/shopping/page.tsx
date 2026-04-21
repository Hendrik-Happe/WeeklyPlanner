import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addShoppingItem, createShoppingList, removeShoppingItem, restoreShoppingItem, setShoppingView, updateShoppingItemTags } from "@/app/(app)/actions"
import ShoppingAddOverlay from "@/components/ShoppingAddOverlay"
import ShoppingListAddOverlay from "@/components/ShoppingListAddOverlay"
import ShoppingTagEditor from "@/components/ShoppingTagEditor"
import { getAccessibleShoppingLists, getOrCreateDefaultShoppingList, getRemovedShoppingItems, getShoppingItems, getShoppingSuggestions } from "@/lib/shopping"

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>
}) {
  const session = await auth()
  const { list: listParam } = await searchParams

  await getOrCreateDefaultShoppingList(session!.user.id)

  const lists = await getAccessibleShoppingLists(session!.user.id)
  const activeList = lists.find((list) => list.id === listParam) ?? lists[0]

  if (!activeList) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <p className="text-sm text-gray-500">Es ist noch keine Einkaufsliste verfügbar.</p>
      </div>
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { shoppingView: true },
  })
  const isGridView = user?.shoppingView === "GRID"

  const shareableUsers = await prisma.user.findMany({
    where: { id: { not: session!.user.id } },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  })

  const [items, removedItems, suggestions] = await Promise.all([
    getShoppingItems(activeList.id),
    getRemovedShoppingItems(activeList.id),
    getShoppingSuggestions(activeList.id),
  ])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28 space-y-6">
      <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <h1 className="text-xl font-bold mb-1">Listen</h1>
        <p className="text-sm text-gray-500">Mehrere Listen, flexibel teilbar. Vorschläge gelten nur für die aktive Liste.</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => {
              const isActive = list.id === activeList.id
              return (
                <a
                  key={list.id}
                  href={`/shopping?list=${list.id}`}
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    isActive
                      ? "bg-blue-100 border-blue-300 text-blue-900"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {list.name}
                </a>
              )
            })}
          </div>
          <ShoppingListAddOverlay action={createShoppingList} users={shareableUsers} />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Aktiv: {activeList.name} · Erstellt von {activeList.createdBy.username}
          {activeList.isSharedWithAll ? " · Für alle freigegeben" : ""}
        </p>

        <div className="mt-3 inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
          <form action={setShoppingView}>
            <input type="hidden" name="view" value="LIST" />
            <button
              type="submit"
              className={`px-3 py-1.5 text-sm font-medium ${
                !isGridView ? "bg-blue-200 text-black" : "bg-white text-black hover:bg-gray-100"
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
                isGridView ? "bg-blue-200 text-black" : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              Kacheln
            </button>
          </form>
        </div>
      </section>

      <ShoppingAddOverlay
        action={addShoppingItem}
        listId={activeList.id}
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
              <div key={item.id} className="relative rounded-xl px-3 py-3 bg-blue-100 border border-blue-200">
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
                    <span key={tag.id} className="text-xs bg-blue-200 text-blue-900 font-medium rounded-full px-2 py-0.5">
                        {tag.value}
                      </span>
                    ))}
                    {item.tags.length === 0 && (
                      <span className="text-xs text-gray-500">Keine Tags</span>
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
                  className="w-full text-left rounded-xl px-3 py-3 bg-red-100 border border-red-200 cursor-pointer hover:bg-red-200 transition-colors"
                >
                  <p className="text-sm text-gray-700 line-through">{item.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.tags.map((tag) => (
                        <span key={tag.id} className="text-xs bg-red-200 text-red-900 font-medium rounded-full px-2 py-0.5">
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
