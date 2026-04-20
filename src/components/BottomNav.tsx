"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const BASE_ITEMS = [
  { href: "/day", label: "Heute", icon: "📅" },
  { href: "/week", label: "Woche", icon: "📆" },
  { href: "/my-tasks", label: "Meine", icon: "✅" },
  { href: "/tasks/new", label: "Neu", icon: "➕" },
  { href: "/settings", label: "Konto", icon: "👤" },
]

export default function BottomNav({ role }: { role: string }) {
  const pathname = usePathname()
  const items =
    role === "ADMIN"
      ? [...BASE_ITEMS, { href: "/admin", label: "Admin", icon: "⚙️" }]
      : BASE_ITEMS

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs font-medium transition-colors ${
              active ? "text-blue-500" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-tight">{item.icon}</span>
            <span className="mt-0.5">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
