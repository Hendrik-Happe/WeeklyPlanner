"use client"

import { useState } from "react"

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
const MONTH_LABELS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

type User = { id: string; username: string }

type InitialValues = {
  title?: string
  description?: string
  assignedToId?: string | null
  isPrivate?: boolean
  recurrenceType?: string
  interval?: number
  weekdays?: number[]
  monthFrom?: number | null
  monthTo?: number | null
  validFrom?: string | null
  validUntil?: string | null
}

type Props = {
  action: (formData: FormData) => Promise<void>
  users: User[]
  isAdmin: boolean
  initialValues?: InitialValues
  submitLabel?: string
}

export default function NewTaskForm({ action, users, isAdmin, initialValues, submitLabel = "Aufgabe erstellen" }: Props) {
  const [recurrenceType, setRecurrenceType] = useState(initialValues?.recurrenceType ?? "ONCE")
  const [selectedDays, setSelectedDays] = useState<number[]>(initialValues?.weekdays ?? [])

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <form action={action} className="space-y-5 pb-4">
      {/* Titel */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Titel <span className="text-red-400">*</span>
        </label>
        <input
          name="title"
          required
          defaultValue={initialValues?.title}
          placeholder="z.B. Rasen mähen"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Beschreibung */}
      <div>
        <label className="block text-sm font-medium mb-1">Beschreibung</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={initialValues?.description ?? ""}
          placeholder="Optional…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Zuweisung (nur Admin) */}
      {isAdmin && users.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Zuweisen an</label>
          <select
            name="assignedToId"
            defaultValue={initialValues?.assignedToId ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Niemand (für alle sichtbar)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Wiederholungstyp */}
      <div>
        <label className="block text-sm font-medium mb-1">Wiederholung</label>
        <select
          name="recurrenceType"
          value={recurrenceType}
          onChange={(e) => {
            setRecurrenceType(e.target.value)
            setSelectedDays([])
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ONCE">Einmalig</option>
          <option value="DAILY">Täglich</option>
          <option value="WEEKLY">Wöchentlich</option>
          <option value="MONTHLY">Monatlich</option>
        </select>
      </div>

      {/* Einmalig: Datum */}
      {recurrenceType === "ONCE" && (
        <div>
          <label className="block text-sm font-medium mb-1">Datum / Deadline</label>
          <input
            type="date"
            name="validFrom"
            defaultValue={initialValues?.validFrom ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Wöchentlich: Wochentage + Intervall */}
      {recurrenceType === "WEEKLY" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Wochentage</label>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-11 h-11 rounded-full text-sm font-medium border-2 transition-colors ${
                    selectedDays.includes(i)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-600 border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedDays.map((d) => (
              <input key={d} type="hidden" name="weekdays" value={d} />
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alle x Wochen</label>
            <input
              type="number"
              name="interval"
              defaultValue={initialValues?.interval ?? 1}
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {/* Monatlich: Intervall */}
      {recurrenceType === "MONTHLY" && (
        <div>
          <label className="block text-sm font-medium mb-1">Alle x Monate</label>
          <input
            type="number"
            name="interval"
            defaultValue={initialValues?.interval ?? 1}
            min={1}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Gültigkeitszeitraum + Monatsspanne (nicht bei einmalig) */}
      {recurrenceType !== "ONCE" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Gültig ab</label>
              <input
                type="date"
                name="validFrom"
                defaultValue={initialValues?.validFrom ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gültig bis</label>
              <input
                type="date"
                name="validUntil"
                defaultValue={initialValues?.validUntil ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nur in bestimmten Monaten (z.B. Rasen April–September)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                name="monthFrom"
                defaultValue={initialValues?.monthFrom ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Monate</option>
                {MONTH_LABELS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                name="monthTo"
                defaultValue={initialValues?.monthTo ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle Monate</option>
                {MONTH_LABELS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Privat */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          name="isPrivate"
          value="true"
          defaultChecked={initialValues?.isPrivate ?? false}
          className="w-5 h-5 rounded border-gray-300 accent-blue-500"
        />
        <span className="text-sm font-medium">
          Privat – nur für mich sichtbar
        </span>
      </label>

      <button
        type="submit"
        className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-3 font-semibold text-base transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  )
}
