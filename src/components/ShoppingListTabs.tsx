"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

type ShoppingListTab = {
  id: string
  name: string
}

type Props = {
  lists: ShoppingListTab[]
  activeListId: string
  selectedListId?: string
}

const LAST_LIST_STORAGE_KEY = "shopping:lastSelectedListId"

export default function ShoppingListTabs({ lists, activeListId, selectedListId }: Props) {
  const pathname = usePathname()
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true

    if (selectedListId) return

    const storedListId = localStorage.getItem(LAST_LIST_STORAGE_KEY)
    if (!storedListId || storedListId === activeListId) return

    const existsInAccessibleLists = lists.some((list) => list.id === storedListId)
    if (!existsInAccessibleLists) {
      localStorage.removeItem(LAST_LIST_STORAGE_KEY)
      return
    }

    window.location.replace(`${pathname}?list=${storedListId}`)
  }, [activeListId, lists, pathname, selectedListId])

  useEffect(() => {
    if (!selectedListId) return

    // Keep the current selection persisted after any server-driven navigation.
    localStorage.setItem(LAST_LIST_STORAGE_KEY, activeListId)
  }, [activeListId, selectedListId])

  return (
    <div className="flex flex-wrap gap-2">
      {lists.map((list) => {
        const isActive = list.id === activeListId
        return (
          <Link
            key={list.id}
            href={`/shopping?list=${list.id}`}
            onClick={() => localStorage.setItem(LAST_LIST_STORAGE_KEY, list.id)}
            className={`px-3 py-1.5 text-xs rounded-full border ${
              isActive
                ? "bg-blue-100 border-blue-300 text-blue-900"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {list.name}
          </Link>
        )
      })}
    </div>
  )
}
