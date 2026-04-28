import {
  createCalendarEvent,
  deleteCalendarEvent,
  refreshNextcloudSharedCalendars,
  updateSelectedNextcloudCalendars,
} from "@/app/(app)/actions"
import { getCurrentSession } from "@/lib/auth"
import {
  getCalendarEventsForRange,
  getCalendarRangeAroundToday,
  getCalendarSyncSettingsView,
  mergeCalendarEvents,
} from "@/lib/calendar"
import { redirect } from "next/navigation"

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "")
  const full = cleaned.length === 3
    ? cleaned.split("").map((c) => c + c).join("")
    : cleaned

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return `rgba(2,132,199,${alpha})`

  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function formatTimeRange(startTime: string | null, endTime: string | null): string {
  if (startTime && endTime) return `${startTime} - ${endTime}`
  if (startTime) return `ab ${startTime}`
  if (endTime) return `bis ${endTime}`
  return "ganztägig"
}

export default async function CalendarPage() {
  const session = await getCurrentSession()
  if (!session) redirect("/login")

  const { from, to, today } = getCalendarRangeAroundToday(7, 30)
  const { sync: calendarSync, discoveredCalendars, selectedCalendarUrls } =
    await getCalendarSyncSettingsView(session.user.id)
  const { localEvents, externalEvents, syncError } = await getCalendarEventsForRange(
    session.user.id,
    from,
    to,
  )
  const events = mergeCalendarEvents(localEvents, externalEvents)

  const grouped = new Map<string, typeof events>()
  for (const event of events) {
    const bucket = grouped.get(event.date) ?? []
    bucket.push(event)
    grouped.set(event.date, bucket)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h1 className="text-xl font-bold">Terminkalender</h1>
        <p className="text-sm text-gray-500 mt-1">
          Eigene Termine und optionaler Nextcloud-Import (iCal-Link) für {from} bis {to}.
        </p>
        {syncError && <p className="text-sm text-amber-700 mt-2">{syncError}</p>}
      </section>

      {calendarSync?.enabled && (
        <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <details>
            <summary className="text-sm font-semibold cursor-pointer select-none">
              Nextcloud-Kalender auswählen
            </summary>
            <div className="mt-3 space-y-3">
              <form action={refreshNextcloudSharedCalendars}>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Geteilte Kalender aktualisieren
                </button>
              </form>

              {discoveredCalendars.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Noch keine Kalender gefunden. Klicke auf "Geteilte Kalender aktualisieren".
                </p>
              ) : (
                <form action={updateSelectedNextcloudCalendars} className="space-y-2">
                  {discoveredCalendars.map((calendar) => {
                    const dotColor = calendar.color ?? "#9ca3af"
                    return (
                      <label
                        key={calendar.url}
                        className="flex items-center gap-2 text-sm text-gray-700 rounded-md px-2 py-1.5 border border-gray-200 bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="selectedCalendarUrls"
                          value={calendar.url}
                          defaultChecked={selectedCalendarUrls.includes(calendar.url)}
                        />
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="font-medium text-gray-800">{calendar.name}</span>
                      </label>
                    )
                  })}

                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Auswahl speichern und Termine aktualisieren
                  </button>
                </form>
              )}
            </div>
          </details>
        </section>
      )}

      <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Termin hinzufügen</h2>
        <form action={createCalendarEvent} className="space-y-3">
          <input
            name="title"
            required
            placeholder="Titel"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="date"
              name="date"
              required
              defaultValue={today}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="time"
              name="startTime"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="time"
              name="endTime"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

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
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Termine</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">Keine Termine im Zeitraum.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([date, dayEvents]) => (
              <div key={date} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">{date}</p>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    (() => {
                      const calendarColor = event.calendarColor ?? "#0284c7"
                      const nextcloudStyle = {
                        borderColor: hexToRgba(calendarColor, 0.45),
                        borderLeftWidth: "4px",
                        borderLeftColor: calendarColor,
                        backgroundColor: hexToRgba(calendarColor, 0.12),
                      }

                      return (
                    <div
                      key={`${event.source}-${event.id}`}
                      className={`rounded-lg border p-3 ${
                        event.source === "NEXTCLOUD"
                          ? ""
                          : "border-gray-200 bg-white"
                      }`}
                      style={
                        event.source === "NEXTCLOUD"
                          ? nextcloudStyle
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {formatTimeRange(event.startTime, event.endTime)}
                            {event.source === "NEXTCLOUD" && ` · ${event.calendarName ?? "Nextcloud"}`}
                          </p>
                          {event.source === "NEXTCLOUD" && (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs mt-1"
                              style={{
                                color: event.calendarColor ?? "#0369a1",
                                backgroundColor: hexToRgba(event.calendarColor ?? "#0284c7", 0.18),
                              }}
                            >
                              {event.calendarName ?? "Nextcloud"}
                            </span>
                          )}
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                              {event.description}
                            </p>
                          )}
                        </div>
                        {event.source === "LOCAL" && (
                          <form action={deleteCalendarEvent}>
                            <input type="hidden" name="eventId" value={event.id} />
                            <button
                              type="submit"
                              className="text-xs text-gray-500 hover:text-red-600"
                            >
                              Entfernen
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                      )
                    })()
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
