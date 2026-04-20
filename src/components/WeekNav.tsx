"use client"

import { useRouter, useSearchParams } from "next/navigation"

type Props = {
  week: number
  label: string
}

export default function WeekNav({ week, label }: Props) {
  const router = useRouter()

  function go(offset: number) {
    const next = week + offset
    router.push(next === 0 ? "/week" : `/week?week=${next}`)
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => go(-1)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all text-lg"
        aria-label="Vorherige Woche"
      >
        ‹
      </button>

      <div className="text-center">
        <h1 className="text-lg font-bold leading-tight">{label}</h1>
        {week !== 0 && (
          <button
            onClick={() => go(-week)}
            className="text-xs text-blue-500 hover:underline mt-0.5"
          >
            Zur aktuellen Woche
          </button>
        )}
      </div>

      <button
        onClick={() => go(1)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition-all text-lg"
        aria-label="Nächste Woche"
      >
        ›
      </button>
    </div>
  )
}
