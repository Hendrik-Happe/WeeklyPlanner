"use client"

import { deleteNextcloudCalendarEvent, updateNextcloudCalendarEvent } from "@/app/(app)/actions"
import { useState } from "react"

type Props = {
  eventId: string
  calendarUrl: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
}

export default function NextcloudEventModalActions(props: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAllDay, setIsAllDay] = useState(!props.startTime && !props.endTime)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs text-gray-500 hover:text-blue-600"
        >
          Bearbeiten
        </button>

        <form action={deleteNextcloudCalendarEvent}>
          <input type="hidden" name="eventId" value={props.eventId} />
          <input type="hidden" name="calendarUrl" value={props.calendarUrl} />
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-red-600"
            onClick={(event) => {
              if (!confirm("Termin wirklich in Nextcloud loeschen?")) {
                event.preventDefault()
              }
            }}
          >
            Loeschen
          </button>
        </form>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Modal schliessen"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Nextcloud-Termin bearbeiten</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schliessen
              </button>
            </div>

            <form
              action={updateNextcloudCalendarEvent}
              className="space-y-2"
              onSubmit={() => setIsOpen(false)}
            >
              <input type="hidden" name="eventId" value={props.eventId} />
              <input type="hidden" name="calendarUrl" value={props.calendarUrl} />

              <input
                name="title"
                required
                defaultValue={props.title}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Startdatum</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={props.date}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Enddatum</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={props.endDate ?? ""}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1.5">
                <input
                  type="checkbox"
                  name="isAllDay"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                />
                <span>Ganztägig</span>
              </label>

              {!isAllDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Startzeit</label>
                    <input
                      type="time"
                      name="startTime"
                      defaultValue={props.startTime ?? ""}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Endzeit</label>
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={props.endTime ?? ""}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
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

              <textarea
                name="description"
                rows={3}
                defaultValue={props.description ?? ""}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
