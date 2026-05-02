"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"

type Props = {
  showPast: boolean
  onlyAssigned: boolean
  onlyCreated: boolean
  onlyOpen: boolean
}

export default function MyTasksFilterBar({
  showPast,
  onlyAssigned,
  onlyCreated,
  onlyOpen,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = useCallback(
    (key: string, value: boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, "1")
      } else {
        params.delete(key)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    },
    [router, pathname, searchParams]
  )

  const activeCount =
    (showPast ? 1 : 0) +
    (onlyAssigned ? 1 : 0) +
    (onlyCreated ? 1 : 0) +
    (onlyOpen ? 1 : 0)

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <button
        onClick={() => setFilter("showPast", !showPast)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          showPast
            ? "bg-amber-100 border-amber-300 text-amber-800"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <span>{showPast ? "✓" : "○"}</span>
        Vergangene anzeigen
      </button>

      <button
        onClick={() => setFilter("onlyAssigned", !onlyAssigned)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          onlyAssigned
            ? "bg-blue-100 border-blue-300 text-blue-800"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <span>{onlyAssigned ? "✓" : "○"}</span>
        Nur zugewiesen
      </button>

      <button
        onClick={() => setFilter("onlyCreated", !onlyCreated)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          onlyCreated
            ? "bg-violet-100 border-violet-300 text-violet-800"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <span>{onlyCreated ? "✓" : "○"}</span>
        Nur erstellt von mir
      </button>

      <button
        onClick={() => setFilter("onlyOpen", !onlyOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          onlyOpen
            ? "bg-green-100 border-green-300 text-green-800"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <span>{onlyOpen ? "✓" : "○"}</span>
        Nur nicht erledigte
      </button>

      {activeCount > 0 && (
        <button
          onClick={() => router.replace(pathname)}
          className="px-3 py-1.5 rounded-full text-sm text-gray-400 hover:text-gray-600 border border-gray-200 bg-white transition-colors"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  )
}
