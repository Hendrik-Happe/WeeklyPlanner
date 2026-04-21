"use client"

import { useEffect, useState } from "react"

export default function OnlineOnlyGuard() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const updateStatus = () => setIsOnline(window.navigator.onLine)

    updateStatus()
    window.addEventListener("online", updateStatus)
    window.addEventListener("offline", updateStatus)

    return () => {
      window.removeEventListener("online", updateStatus)
      window.removeEventListener("offline", updateStatus)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/85 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900">Keine Internetverbindung</h2>
        <p className="mt-2 text-sm text-gray-600">
          Diese App funktioniert nur online. Bitte stelle die Verbindung wieder her und lade die Seite neu.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}