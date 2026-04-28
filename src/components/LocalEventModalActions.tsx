"use client"

import {
  addCalendarEventShare,
  deleteCalendarEvent,
  removeCalendarEventShare,
  updateLocalCalendarEvent,
} from "@/app/(app)/actions"
import { useState } from "react"

type SharedUser = { id: string; username: string }

type Props = {
  eventId: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  isCreator: boolean
  sharedWith: SharedUser[]
  allUsers: SharedUser[]
}

export default function LocalEventModalActions(props: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [isAllDay, setIsAllDay] = useState(!props.startTime && !props.endTime)

  const usersNotShared = props.allUsers.filter(
    (u) => !props.sharedWith.some((s) => s.id === u.id),
  )

  if (!props.isCreator) return null

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="text-xs text-gray-500 hover:text-blue-600"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="text-xs text-gray-500 hover:text-green-600"
        >
          Teilen{props.sharedWith.length > 0 ? ` (${props.sharedWith.length})` : ""}
        </button>
        <form action={deleteCalendarEvent} className="contents">
          <input type="hidden" name="eventId" value={props.eventId} />
          <button
            type="submit"
            className="text-xs text-gray-500 hover:text-red-600"
            onClick={(e) => {
              if (!confirm("Termin wirklich löschen?")) e.preventDefault()
            }}
          >
            Entfernen
          </button>
        </form>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Modal schliessen"
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Termin bearbeiten</h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schliessen
              </button>
            </div>
            <form
              action={updateLocalCalendarEvent}
              onSubmit={() => setEditOpen(false)}
              className="space-y-3"
            >
              <input type="hidden" name="eventId" value={props.eventId} />
              <input
                name="title"
                required
                defaultValue={props.title}
                placeholder="Titel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Startdatum</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={props.date}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Enddatum</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={props.endDate ?? ""}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Startzeit</label>
                    <input
                      type="time"
                      name="startTime"
                      defaultValue={props.startTime ?? ""}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Endzeit</label>
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={props.endTime ?? ""}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
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
              <label className="flex items-center gap-2 text-sm text-gray-700 px-1">
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
                defaultValue={props.description ?? ""}
                placeholder="Notiz (optional)"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Management Modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Modal schliessen"
            className="absolute inset-0 bg-black/40"
            onClick={() => setShareOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Termin teilen</h3>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Schliessen
              </button>
            </div>

            {props.sharedWith.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Geteilt mit
                </p>
                <div className="space-y-1">
                  {props.sharedWith.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-gray-50">
                      <span className="text-sm text-gray-800">{user.username}</span>
                      <form action={removeCalendarEventShare} className="contents">
                        <input type="hidden" name="eventId" value={props.eventId} />
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Entfernen
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {usersNotShared.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Nutzer hinzufügen
                </p>
                <div className="space-y-1">
                  {usersNotShared.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-gray-50">
                      <span className="text-sm text-gray-800">{user.username}</span>
                      <form action={addCalendarEventShare} className="contents">
                        <input type="hidden" name="eventId" value={props.eventId} />
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Hinzufügen
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {props.sharedWith.length === 0 && usersNotShared.length === 0 && (
              <p className="text-sm text-gray-500">Keine weiteren Nutzer vorhanden.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
