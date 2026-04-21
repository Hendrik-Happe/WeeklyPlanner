"use client"

import { useState } from "react"
import { changePin } from "@/app/(app)/actions"
import { getPinMinLength } from "@/lib/security-config"

export default function ChangePinForm() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const pinMinLength = getPinMinLength()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    try {
      await changePin(fd)
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Ändern des PINs")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Aktueller PIN</label>
        <input
          name="currentPin"
          type="password"
          inputMode="numeric"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Neuer PIN (mind. {pinMinLength} Zeichen)</label>
        <input
          name="newPin"
          type="password"
          inputMode="numeric"
          required
          minLength={pinMinLength}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Neuen PIN bestätigen</label>
        <input
          name="confirmPin"
          type="password"
          inputMode="numeric"
          required
          minLength={pinMinLength}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2">
          PIN erfolgreich geändert ✓
        </p>
      )}
      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold text-base transition-colors"
      >
        PIN ändern
      </button>
    </form>
  )
}
