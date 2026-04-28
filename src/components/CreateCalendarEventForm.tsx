"use client"

import { createCalendarEvent } from "@/app/(app)/actions"
import { useState } from "react"

type Props = {
  today: string
  hasNextcloud: boolean
  nextcloudTargets: Array<{ url: string; name: string }>
}

export default function CreateCalendarEventForm({
  today,
  hasNextcloud,
  nextcloudTargets,
}: Props) {
  const [isAllDay, setIsAllDay] = useState(false)

  return (
    <form action={createCalendarEvent} className="space-y-3">
      <input
        name="title"
        required
        placeholder="Titel"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />

      {hasNextcloud ? (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Kalender</label>
          <select
            name="calendarTarget"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="local">Lokal (nur in dieser App)</option>
            {nextcloudTargets.map((c) => (
              <option key={c.url} value={c.url}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="calendarTarget" value="local" />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Startdatum</label>
          <input
            type="date"
            name="date"
            required
            defaultValue={today}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Enddatum</label>
          <input
            type="date"
            name="endDate"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {!isAllDay && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Startzeit</label>
            <input
              type="time"
              name="startTime"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Endzeit</label>
            <input
              type="time"
              name="endTime"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {isAllDay && (
        <>
          <input type="hidden" name="startTime" value="" />
          <input type="hidden" name="endTime" value="" />
        </>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1.5">
        <input
          type="checkbox"
          name="isAllDay"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
        />
        <span>Ganztägig</span>
      </label>

      <textarea
        name="description"
        placeholder="Notiz (optional)"
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
      />

      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        Speichern
      </button>
    </form>
  )
}
