"use client"

import { useState } from "react"
import { changePassword } from "@/app/(app)/actions"
import { getPasswordMinLength } from "@/lib/security-config"

export default function ChangePasswordForm() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const passwordMinLength = getPasswordMinLength()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    try {
      await changePassword(fd)
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Ändern des Passworts")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Aktuelles Passwort</label>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Neues Passwort (mind. {passwordMinLength} Zeichen)</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={passwordMinLength}
          autoComplete="new-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Neues Passwort bestätigen</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={passwordMinLength}
          autoComplete="new-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2">
          Passwort erfolgreich geändert ✓
        </p>
      )}
      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold text-base transition-colors"
      >
        Passwort ändern
      </button>
    </form>
  )
}
