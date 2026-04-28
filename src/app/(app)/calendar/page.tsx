import {
  deleteCalendarEvent,
  refreshNextcloudSharedCalendars,
  updateSelectedNextcloudCalendars,
} from "@/app/(app)/actions"
import CreateCalendarEventModal from "@/components/CreateCalendarEventModal"
import NextcloudEventModalActions from "@/components/NextcloudEventModalActions"
import { getCurrentSession } from "@/lib/auth"
import {
  eventSpansDate,
  getCalendarEventsForRange,
  getCalendarSyncSettingsView,
  mergeCalendarEvents,
} from "@/lib/calendar"
import { formatDate, getTodayInBerlin } from "@/lib/tasks"
import Link from "next/link"
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

function formatTimeRange(startTime: string | null, endTime: string | null, date: string, endDate: string | null): string {
  const dayRange = endDate && endDate !== date ? `${date} bis ${endDate} · ` : ""
  if (startTime && endTime) return `${dayRange}${startTime} - ${endTime}`
  if (startTime) return `ab ${startTime}`
  if (endTime) return `bis ${endTime}`
  return `${dayRange}ganztägig`
}

function parseIsoDateToUtc(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getCalendarGridDates(from: string, to: string): string[] {
  const start = parseIsoDateToUtc(from)
  const end = parseIsoDateToUtc(to)

  const startDay = start.getUTCDay()
  const offsetToMonday = startDay === 0 ? 6 : startDay - 1
  start.setUTCDate(start.getUTCDate() - offsetToMonday)

  const endDay = end.getUTCDay()
  const offsetToSunday = endDay === 0 ? 0 : 7 - endDay
  end.setUTCDate(end.getUTCDate() + offsetToSunday)

  const result: string[] = []
  const current = new Date(start)
  while (current.getTime() <= end.getTime()) {
    result.push(formatUtcDate(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return result
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week: weekParam } = await searchParams
  const weekOffset = parseInt(weekParam ?? "0", 10) || 0

  const session = await getCurrentSession()
  if (!session) redirect("/login")

  const todayDate = getTodayInBerlin()
  const today = formatDate(todayDate)
  const baseDate = new Date(todayDate)
  baseDate.setDate(todayDate.getDate() + weekOffset * 7)
  const weekDays = getWeekDays(baseDate)
  const from = formatDate(weekDays[0])
  const to = formatDate(weekDays[6])
  const weekLabel = `KW ${getISOWeek(weekDays[0])}`
  const { sync: calendarSync, discoveredCalendars, selectedCalendarUrls } =
    await getCalendarSyncSettingsView(session.user.id)
  const { localEvents, externalEvents, syncError } = await getCalendarEventsForRange(
    session.user.id,
    from,
    to,
  )
  const events = mergeCalendarEvents(localEvents, externalEvents)

  const grouped = new Map<string, typeof events>()
  for (const date of weekDays.map((day) => formatDate(day))) {
    grouped.set(
      date,
      events.filter((event) => eventSpansDate(event, date)),
    )
  }
  const gridDates = getCalendarGridDates(from, to)
  const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h1 className="text-xl font-bold">Terminkalender</h1>
        <p className="text-sm text-gray-500 mt-1">
          Agenda der ausgewählten Woche ({from} bis {to}) mit optionalem Nextcloud-Import.
        </p>
        {syncError && <p className="text-sm text-amber-700 mt-2">{syncError}</p>}
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <Link
            href={weekOffset - 1 === 0 ? "/calendar" : `/calendar?week=${weekOffset - 1}`}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Vorherige Woche"
          >
            ‹
          </Link>
          <div className="text-center">
            <p className="text-sm font-semibold">{weekLabel}</p>
            <p className="text-xs text-gray-500">{from} bis {to}</p>
            {weekOffset !== 0 && (
              <Link href="/calendar" className="text-xs text-blue-600 hover:underline">
                Zur aktuellen Woche
              </Link>
            )}
          </div>
          <Link
            href={weekOffset + 1 === 0 ? "/calendar" : `/calendar?week=${weekOffset + 1}`}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label="Nächste Woche"
          >
            ›
          </Link>
        </div>
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

      {(() => {
        const nextcloudTargets = discoveredCalendars.filter(
          (c) => selectedCalendarUrls.includes(c.url),
        )
        const hasNextcloud = !!(calendarSync?.oauthAccessToken && nextcloudTargets.length > 0)
        return (
          <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Neuer Termin</h2>
              <CreateCalendarEventModal
                today={today}
                hasNextcloud={hasNextcloud}
                nextcloudTargets={nextcloudTargets}
              />
            </div>
          </section>
        )
      })()}

      <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Kalenderansicht</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekdayLabels.map((label) => (
                <div key={label} className="text-xs font-semibold text-gray-500 px-1">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {gridDates.map((date) => {
                const dayEvents = grouped.get(date) ?? []
                const isToday = date === today
                const isInPrimaryRange = date >= from && date <= to

                return (
                  <div
                    key={date}
                    className={`min-h-28 rounded-lg border p-2 ${
                      isToday
                        ? "border-blue-300 bg-blue-50"
                        : isInPrimaryRange
                        ? "border-gray-200 bg-white"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <p className={`text-xs mb-1 ${isInPrimaryRange ? "text-gray-700" : "text-gray-400"}`}>
                      {new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        timeZone: "Europe/Berlin",
                      })}
                    </p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={`${event.source}-${event.id}`}
                          className="text-[11px] rounded px-1.5 py-0.5 truncate"
                          style={
                            event.source === "NEXTCLOUD"
                              ? {
                                  color: event.calendarColor ?? "#0369a1",
                                  backgroundColor: hexToRgba(event.calendarColor ?? "#0284c7", 0.18),
                                }
                              : undefined
                          }
                        >
                          {event.startTime ? `${event.startTime} ` : ""}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[11px] text-gray-500">+{dayEvents.length - 3} weitere</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Agenda</h2>
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
                            {formatTimeRange(event.startTime, event.endTime, event.date, event.endDate)}
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

                        {event.source === "NEXTCLOUD" && event.calendarUrl && (
                          <NextcloudEventModalActions
                            eventId={event.id}
                            calendarUrl={event.calendarUrl}
                            title={event.title}
                            description={event.description}
                            date={event.date}
                            endDate={event.endDate}
                            startTime={event.startTime}
                            endTime={event.endTime}
                          />
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
