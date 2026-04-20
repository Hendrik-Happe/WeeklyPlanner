"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"

export type TaskFilter = {
  hideDone: boolean
  hideAssigned: boolean
}

type Props = {
  hideDone: boolean
  hideAssigned: boolean
}

export default function FilterBar({ hideDone, hideAssigned }: Props) {
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
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const activeCount = (hideDone ? 1 : 0) + (hideAssigned ? 1 : 0)

  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      <button
        onClick={() => setFilter("hideDone", !hideDone)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          hideDone
            ? "bg-green-100 border-green-300 text-green-800"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <span>{hideDone ? "✓" : "○"}</span>
        Erledigte ausblenden
      </button>
      <button
        onClick={() => setFilter("hideAssigned", !hideAssigned)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          hideAssigned
            ? "bg-blue-100 border-blue-300 text-blue-800"
            : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <span>{hideAssigned ? "✓" : "○"}</span>
        Zugewiesene ausblenden
      </button>
      {activeCount > 0 && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString())
            params.delete("hideDone")
            params.delete("hideAssigned")
            router.replace(`${pathname}?${params.toString()}`)
          }}
          className="px-3 py-1.5 rounded-full text-sm text-gray-400 hover:text-gray-600 border border-gray-200 bg-white transition-colors"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  )
}
