import { prisma } from "@/lib/prisma"
import { formatDate, getTodayInBerlin } from "@/lib/tasks"

type ExternalCalendarEvent = {
  id: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  source: "NEXTCLOUD"
  calendarUrl: string | null
  calendarName: string | null
  calendarColor: string | null
}

export type DiscoveredNextcloudCalendar = {
  url: string
  name: string
  color: string | null
}

function normalizeCalendarColor(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  const withHash = value.startsWith("#") ? value : `#${value}`

  // Nextcloud colors are usually hex; keep valid CSS hex only.
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) return withHash.toLowerCase()

  // Some systems may return RGBA hex; drop alpha for consistent UI colors.
  if (/^#[0-9a-fA-F]{8}$/.test(withHash)) {
    return `#${withHash.slice(1, 7).toLowerCase()}`
  }

  return null
}

function normalizeCalendarFeedUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  url.hash = ""
  url.searchParams.set("export", "")

  // Keep path canonical to avoid mismatch between trailing slash variants.
  const path = url.pathname.replace(/\/+$/, "")
  url.pathname = path || "/"

  return url.toString().replace("export=", "export")
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
}

function parseSelectedCalendarUrls(rawJson: string | null | undefined): string[] {
  if (!rawJson) return []

  try {
    const parsed = JSON.parse(rawJson) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
  } catch {
    return []
  }
}

function parseDiscoveredCalendars(rawJson: string | null | undefined): DiscoveredNextcloudCalendar[] {
  if (!rawJson) return []

  try {
    const parsed = JSON.parse(rawJson) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null
        const obj = entry as { url?: unknown; name?: unknown; color?: unknown }
        const url = typeof obj.url === "string" ? obj.url.trim() : ""
        const name = typeof obj.name === "string" ? obj.name.trim() : ""
        const color = normalizeCalendarColor(typeof obj.color === "string" ? obj.color : null)
        if (!url || !name) return null
        return { url: normalizeCalendarFeedUrl(url), name, color }
      })
      .filter((entry): entry is DiscoveredNextcloudCalendar => Boolean(entry))
  } catch {
    return []
  }
}

function buildDefaultNextcloudCalendarUrl(serverUrl: string, username: string): string {
  const calendarSlug = process.env.NEXTCLOUD_DEFAULT_CALENDAR_SLUG?.trim() || "personal"
  const url = new URL(
    `/remote.php/dav/calendars/${encodeURIComponent(username)}/${encodeURIComponent(calendarSlug)}`,
    serverUrl,
  )
  url.searchParams.set("export", "")
  return url.toString().replace("export=", "export")
}

function withExportParam(rawUrl: string): string {
  const url = new URL(rawUrl)
  if (!url.searchParams.has("export")) {
    url.searchParams.set("export", "")
  }
  return url.toString().replace("export=", "export")
}

function sanitizeCalendarUrl(rawUrl: string): string {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error("Ungültige Kalender-URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Ungültige Kalender-URL")
  }

  return parsed.toString()
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .trim()
}

function normalizeIcsLines(icsText: string): string[] {
  const lines = icsText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const unfolded: string[] = []

  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.trimStart()
    } else {
      unfolded.push(line)
    }
  }

  return unfolded
}

function toDateParts(raw: string): { date: string; time: string | null; isDateOnly: boolean } | null {
  // Supported: YYYYMMDD and YYYYMMDDTHHMM[SS][Z]
  if (/^\d{8}$/.test(raw)) {
    const yyyy = raw.slice(0, 4)
    const mm = raw.slice(4, 6)
    const dd = raw.slice(6, 8)
    return { date: `${yyyy}-${mm}-${dd}`, time: null, isDateOnly: true }
  }

  const dateTime = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
  if (!dateTime) return null

  const [, yyyy, mm, dd, hh, min] = dateTime
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}`, isDateOnly: false }
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function parseIcsEvents(icsText: string): ExternalCalendarEvent[] {
  const lines = normalizeIcsLines(icsText)
  const events: ExternalCalendarEvent[] = []

  let inEvent = false
  let uid = ""
  let summary = ""
  let description = ""
  let dtStartRaw = ""
  let dtEndRaw = ""

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true
      uid = ""
      summary = ""
      description = ""
      dtStartRaw = ""
      dtEndRaw = ""
      continue
    }

    if (line === "END:VEVENT" && inEvent) {
      inEvent = false
      const start = toDateParts(dtStartRaw)
      const end = dtEndRaw ? toDateParts(dtEndRaw) : null
      if (!start) continue

      events.push({
        id: uid || `nextcloud-${start.date}-${summary}`,
        title: summary || "Ohne Titel",
        description: description || null,
        date: start.date,
        endDate: end
          ? end.isDateOnly
            ? addDaysToIsoDate(end.date, -1)
            : end.date
          : null,
        startTime: start.time,
        endTime: end?.time ?? null,
        source: "NEXTCLOUD",
        calendarUrl: null,
        calendarName: null,
        calendarColor: null,
      })
      continue
    }

    if (!inEvent) continue

    if (line.startsWith("UID:")) uid = line.slice(4).trim()
    if (line.startsWith("SUMMARY:")) summary = unescapeIcsText(line.slice(8))
    if (line.startsWith("DESCRIPTION:")) description = unescapeIcsText(line.slice(12))
    if (line.startsWith("DTSTART")) {
      const idx = line.indexOf(":")
      if (idx > -1) dtStartRaw = line.slice(idx + 1).trim()
    }
    if (line.startsWith("DTEND")) {
      const idx = line.indexOf(":")
      if (idx > -1) dtEndRaw = line.slice(idx + 1).trim()
    }
  }

  return events
}

export async function getCalendarSyncSetting(userId: string) {
  return prisma.calendarSyncSetting.findUnique({
    where: { userId },
    select: {
      enabled: true,
      nextcloudServerUrl: true,
      nextcloudIcsUrl: true,
      discoveredCalendarsJson: true,
      selectedCalendarUrlsJson: true,
      nextcloudUsername: true,
      nextcloudAppPassword: true,
      oauthAccessToken: true,
      oauthRefreshToken: true,
      oauthTokenExpiresAt: true,
      updatedAt: true,
    },
  })
}

export async function getCalendarSyncSettingsView(userId: string) {
  const sync = await getCalendarSyncSetting(userId)
  return {
    sync,
    discoveredCalendars: parseDiscoveredCalendars(sync?.discoveredCalendarsJson),
    selectedCalendarUrls: parseSelectedCalendarUrls(sync?.selectedCalendarUrlsJson),
  }
}

async function refreshNextcloudAccessToken(args: {
  userId: string
  serverUrl: string
  refreshToken: string
}): Promise<string | null> {
  const clientId = process.env.NEXTCLOUD_OAUTH_CLIENT_ID
  const clientSecret = process.env.NEXTCLOUD_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const tokenEndpoint = new URL("/apps/oauth2/api/v1/token", args.serverUrl).toString()
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })

  if (!response.ok) return null

  const json = await response.json() as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }
  if (!json.access_token) return null

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600
  const nextExpiry = new Date(Date.now() + Math.max(60, expiresIn - 30) * 1000)

  await prisma.calendarSyncSetting.update({
    where: { userId: args.userId },
    data: {
      oauthAccessToken: json.access_token,
      oauthRefreshToken: json.refresh_token ?? args.refreshToken,
      oauthTokenExpiresAt: nextExpiry,
      enabled: true,
    },
  })

  return json.access_token
}

async function getValidNextcloudAccessToken(
  userId: string,
  sync: NonNullable<Awaited<ReturnType<typeof getCalendarSyncSetting>>>,
): Promise<string | null> {
  let token = sync.oauthAccessToken
  if (!token) return null

  const expiresAt = sync.oauthTokenExpiresAt

  const shouldRefresh =
    sync.oauthRefreshToken &&
    sync.nextcloudServerUrl &&
    expiresAt &&
    expiresAt.getTime() <= Date.now() + 30_000

  if (!shouldRefresh) return token

  const refreshed = await refreshNextcloudAccessToken({
    userId,
    serverUrl: sync.nextcloudServerUrl!,
    refreshToken: sync.oauthRefreshToken!,
  })
  return refreshed ?? token
}

export async function discoverNextcloudCalendars(userId: string): Promise<DiscoveredNextcloudCalendar[]> {
  const sync = await getCalendarSyncSetting(userId)
  if (!sync?.nextcloudServerUrl || !sync.nextcloudUsername) return []

  const accessToken = await getValidNextcloudAccessToken(userId, sync)
  if (!accessToken) return []

  const discoveryUrl = new URL(
    `/remote.php/dav/calendars/${encodeURIComponent(sync.nextcloudUsername)}/`,
    sync.nextcloudServerUrl,
  ).toString()

  const response = await fetch(discoveryUrl, {
    method: "PROPFIND",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:apple="http://apple.com/ns/ical/" xmlns:cs="http://calendarserver.org/ns/" xmlns:cal="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <apple:calendar-color />
    <oc:calendar-color />
    <cs:calendar-color />
  </d:prop>
</d:propfind>`,
    cache: "no-store",
  })

  if (!response.ok) return []

  const xml = await response.text()
  const blocks = xml.split(/<[^>]*response[^>]*>/i)
  const calendars: DiscoveredNextcloudCalendar[] = []
  const seen = new Set<string>()

  for (const block of blocks) {
    if (!/<[^>]*calendar\s*\/?\s*>/i.test(block)) continue

    const hrefMatch = block.match(/<[^>]*href>([\s\S]*?)<\/[^>]*href>/i)
    if (!hrefMatch) continue
    const href = decodeXmlEntities(hrefMatch[1].trim())
    if (!href) continue

    const absoluteUrl = normalizeCalendarFeedUrl(
      withExportParam(new URL(href, sync.nextcloudServerUrl).toString()),
    )
    if (seen.has(absoluteUrl)) continue

    const displayNameMatch = block.match(/<[^>]*displayname>([\s\S]*?)<\/[^>]*displayname>/i)
    const colorMatch = block.match(/<[^>]*calendar-color[^>]*>([\s\S]*?)<\/[^>]*calendar-color>/i)
    const displayName = displayNameMatch ? decodeXmlEntities(displayNameMatch[1].trim()) : ""

    let fallbackName = absoluteUrl
    try {
      const segments = new URL(absoluteUrl).pathname.split("/").filter(Boolean)
      fallbackName = decodeURIComponent(segments.at(-1) ?? absoluteUrl)
    } catch {
      // ignore
    }

    calendars.push({
      url: absoluteUrl,
      name: displayName || fallbackName,
      color: normalizeCalendarColor(colorMatch ? decodeXmlEntities(colorMatch[1].trim()) : null),
    })
    seen.add(absoluteUrl)
  }

  return calendars.sort((a, b) => a.name.localeCompare(b.name, "de"))
}

async function fetchExternalEventsFromUrl(args: {
  url: string
  headers: HeadersInit
  from: string
  to: string
  calendarName?: string | null
  calendarColor?: string | null
}): Promise<{ events: ExternalCalendarEvent[]; error: string | null }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  let response = await fetch(args.url, {
    cache: "no-store",
    signal: controller.signal,
    headers: args.headers,
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return {
        events: [],
        error: "Nextcloud-Login fehlgeschlagen. Bitte die Verbindung erneuern.",
      }
    }
    return { events: [], error: "Nextcloud-Sync nicht erreichbar." }
  }

  let icsText = await response.text()
  if (!icsText.includes("BEGIN:VCALENDAR")) {
    const exportUrl = withExportParam(args.url)
    if (exportUrl !== args.url) {
      response = await fetch(exportUrl, {
        cache: "no-store",
        signal: controller.signal,
        headers: args.headers,
      })

      if (response.ok) {
        icsText = await response.text()
      }
    }
  }

  if (!icsText.includes("BEGIN:VCALENDAR")) {
    return {
      events: [],
      error:
        "Der konfigurierte Nextcloud-Link ist kein iCal-Feed. Bitte die abonnierbare .ics-URL aus Nextcloud verwenden.",
    }
  }

  const allExternal = parseIcsEvents(icsText)
  const events = allExternal
    .filter((event) => {
      const endDate = event.endDate ?? event.date
      return event.date <= args.to && endDate >= args.from
    })
    .map((event) => ({
      ...event,
      calendarUrl: args.url,
      calendarName: args.calendarName ?? "Nextcloud",
      calendarColor: args.calendarColor ?? null,
    }))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if ((a.startTime ?? "") !== (b.startTime ?? "")) return (a.startTime ?? "").localeCompare(b.startTime ?? "")
      return a.title.localeCompare(b.title)
    })

  return { events, error: null }
}

export async function getCalendarEventsForRange(userId: string, from: string, to: string) {
  const localEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      AND: [
        { date: { lte: to } },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: from } },
          ],
        },
      ],
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
  })

  const sync = await getCalendarSyncSetting(userId)
  if (!sync?.enabled) {
    return {
      localEvents,
      externalEvents: [] as ExternalCalendarEvent[],
      syncError: null as string | null,
    }
  }

  const configuredDefaultIcsUrl = process.env.NEXTCLOUD_DEFAULT_ICS_URL?.trim() || null
  const generatedDefaultIcsUrl =
    sync.nextcloudServerUrl && sync.nextcloudUsername
      ? buildDefaultNextcloudCalendarUrl(sync.nextcloudServerUrl, sync.nextcloudUsername)
      : null
  const selectedCalendarUrls = parseSelectedCalendarUrls(sync.selectedCalendarUrlsJson)
  const discoveredByUrl = new Map(
    parseDiscoveredCalendars(sync.discoveredCalendarsJson).map((calendar) => [
      normalizeCalendarFeedUrl(calendar.url),
      calendar,
    ]),
  )
  const effectiveUrls = selectedCalendarUrls.length > 0
    ? selectedCalendarUrls
    : [sync.nextcloudIcsUrl?.trim() || configuredDefaultIcsUrl || generatedDefaultIcsUrl].filter(
        (value): value is string => Boolean(value),
      )

  if (effectiveUrls.length === 0) {
    return {
      localEvents,
      externalEvents: [] as ExternalCalendarEvent[],
      syncError:
        "Nextcloud verbunden, aber kein Kalender-Feed gefunden. Bitte einmal in den erweiterten Einstellungen eine Kalender-URL setzen.",
    }
  }

  try {
    const oauthAccessToken = await getValidNextcloudAccessToken(userId, sync)

    const requestHeaders: HeadersInit = {
      Accept: "text/calendar,text/plain;q=0.9,*/*;q=0.8",
    }

    if (oauthAccessToken) {
      requestHeaders.Authorization = `Bearer ${oauthAccessToken}`
    } else if (sync.nextcloudUsername && sync.nextcloudAppPassword) {
      requestHeaders.Authorization = `Basic ${Buffer.from(`${sync.nextcloudUsername}:${sync.nextcloudAppPassword}`).toString("base64")}`
    }

    const mergedExternal: ExternalCalendarEvent[] = []
    let firstError: string | null = null

    for (const rawUrl of effectiveUrls) {
      const url = normalizeCalendarFeedUrl(sanitizeCalendarUrl(rawUrl))
      const discoveredCalendar = discoveredByUrl.get(normalizeCalendarFeedUrl(url))
      const result = await fetchExternalEventsFromUrl({
        url,
        headers: requestHeaders,
        from,
        to,
        calendarName: discoveredCalendar?.name ?? null,
        calendarColor: discoveredCalendar?.color ?? null,
      })
      if (result.error && !firstError) firstError = result.error
      mergedExternal.push(...result.events)
    }

    const dedup = new Map<string, ExternalCalendarEvent>()
    for (const event of mergedExternal) {
      const key = `${event.calendarUrl ?? ""}|${event.date}|${event.endDate ?? ""}|${event.startTime ?? ""}|${event.title}|${event.id}`
      if (!dedup.has(key)) dedup.set(key, event)
    }

    const externalEvents = Array.from(dedup.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if ((a.startTime ?? "") !== (b.startTime ?? "")) return (a.startTime ?? "").localeCompare(b.startTime ?? "")
      return a.title.localeCompare(b.title)
    })

    return {
      localEvents,
      externalEvents,
      syncError: externalEvents.length > 0 ? null : (firstError as string | null),
    }
  } catch {
    return {
      localEvents,
      externalEvents: [] as ExternalCalendarEvent[],
      syncError: "Nextcloud-Sync fehlgeschlagen.",
    }
  }
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function normalizeCalendarCollectionUrl(calendarUrl: string): string {
  return sanitizeCalendarUrl(calendarUrl.replace(/\?.*$/, "").replace(/\/+$/, "") + "/")
}

function buildIcsContent(args: {
  uid: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
}): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z"
  const dateCompact = args.date.replace(/-/g, "")

  let dtStart: string
  let dtEnd: string

  if (args.startTime) {
    const startCompact = args.startTime.replace(":", "") + "00"
    dtStart = `DTSTART;TZID=Europe/Berlin:${dateCompact}T${startCompact}`

    if (args.endTime) {
      const endCompact = args.endTime.replace(":", "") + "00"
      const endDateCompact = (args.endDate ?? args.date).replace(/-/g, "")
      dtEnd = `DTEND;TZID=Europe/Berlin:${endDateCompact}T${endCompact}`
    } else {
      const [hh, mm] = args.startTime.split(":").map(Number)
      const endHH = String((hh + 1) % 24).padStart(2, "0")
      const endMM = String(mm).padStart(2, "0")
      dtEnd = `DTEND;TZID=Europe/Berlin:${dateCompact}T${endHH}${endMM}00`
    }
  } else {
    dtStart = `DTSTART;VALUE=DATE:${dateCompact}`
    const nextDay = new Date((args.endDate ?? args.date) + "T00:00:00")
    nextDay.setDate(nextDay.getDate() + 1)
    const nextDayCompact = nextDay.toISOString().slice(0, 10).replace(/-/g, "")
    dtEnd = `DTEND;VALUE=DATE:${nextDayCompact}`
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WeeklyPlaner//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${args.uid}`,
    `DTSTAMP:${now}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escapeIcsText(args.title)}`,
  ]

  if (args.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(args.description)}`)
  }

  lines.push("END:VEVENT", "END:VCALENDAR")
  return lines.join("\r\n") + "\r\n"
}

async function getNextcloudBearerToken(userId: string): Promise<string> {
  const sync = await getCalendarSyncSetting(userId)
  if (!sync) throw new Error("Nextcloud nicht konfiguriert")

  const token = await getValidNextcloudAccessToken(userId, sync)
  if (!token) throw new Error("Kein gültiger Nextcloud-Token")
  return token
}

async function findNextcloudEventHrefByUid(args: {
  userId: string
  calendarUrl: string
  uid: string
}): Promise<string | null> {
  const token = await getNextcloudBearerToken(args.userId)
  const collectionUrl = normalizeCalendarCollectionUrl(args.calendarUrl)

  const response = await fetch(collectionUrl, {
    method: "REPORT",
    headers: {
      Authorization: `Bearer ${token}`,
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
    body: `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:prop-filter name="UID">
          <c:text-match collation="i;octet">${escapeXmlText(args.uid)}</c:text-match>
        </c:prop-filter>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Nextcloud-Fehler bei Eventsuche: ${response.status}`)
  }

  const xml = await response.text()
  const hrefMatch = xml.match(/<[^>]*href>([\s\S]*?)<\/[^>]*href>/i)
  if (!hrefMatch) return null

  const href = decodeXmlEntities(hrefMatch[1].trim())
  if (!href) return null

  const eventUrl = sanitizeCalendarUrl(new URL(href, collectionUrl).toString())
  return eventUrl
}

export async function createCalendarEventInNextcloud(
  userId: string,
  calendarUrl: string,
  event: {
    title: string
    description: string | null
    date: string
    endDate: string | null
    startTime: string | null
    endTime: string | null
  },
): Promise<void> {
  const token = await getNextcloudBearerToken(userId)

  const uid = `${crypto.randomUUID()}@weeklyplaner`
  const icsContent = buildIcsContent({ uid, ...event })

  // Strip ?export and trailing slashes to get the raw CalDAV collection URL
  const baseUrl = normalizeCalendarCollectionUrl(calendarUrl).replace(/\/+$/, "")
  const fileId = uid.split("@")[0]
  const putUrl = sanitizeCalendarUrl(`${baseUrl}/${encodeURIComponent(fileId)}.ics`)

  const response = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
    body: icsContent,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Nextcloud-Fehler beim Anlegen des Termins: ${response.status}`)
  }
}

export async function updateCalendarEventInNextcloud(
  userId: string,
  calendarUrl: string,
  eventId: string,
  event: {
    title: string
    description: string | null
    date: string
    endDate: string | null
    startTime: string | null
    endTime: string | null
  },
): Promise<void> {
  const token = await getNextcloudBearerToken(userId)
  const eventUrl = await findNextcloudEventHrefByUid({
    userId,
    calendarUrl,
    uid: eventId,
  })
  if (!eventUrl) throw new Error("Nextcloud-Termin nicht gefunden")

  const icsContent = buildIcsContent({ uid: eventId, ...event })
  const response = await fetch(eventUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/calendar; charset=utf-8",
    },
    body: icsContent,
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Nextcloud-Fehler beim Bearbeiten des Termins: ${response.status}`)
  }
}

export async function deleteCalendarEventInNextcloud(
  userId: string,
  calendarUrl: string,
  eventId: string,
): Promise<void> {
  const token = await getNextcloudBearerToken(userId)
  const eventUrl = await findNextcloudEventHrefByUid({
    userId,
    calendarUrl,
    uid: eventId,
  })
  if (!eventUrl) throw new Error("Nextcloud-Termin nicht gefunden")

  const response = await fetch(eventUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Nextcloud-Fehler beim Löschen des Termins: ${response.status}`)
  }
}

export function getCalendarRangeAroundToday(daysBefore = 7, daysAfter = 30) {
  const today = getTodayInBerlin()
  const fromDate = new Date(today)
  const toDate = new Date(today)
  fromDate.setDate(today.getDate() - daysBefore)
  toDate.setDate(today.getDate() + daysAfter)
  return {
    from: formatDate(fromDate),
    to: formatDate(toDate),
    today: formatDate(today),
  }
}

export type CalendarCombinedEvent = {
  id: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  source: "LOCAL" | "NEXTCLOUD"
  calendarUrl: string | null
  calendarName: string | null
  calendarColor: string | null
}

export function mergeCalendarEvents(
  localEvents: Array<{
    id: string
    title: string
    description: string | null
    date: string
    endDate: string | null
    startTime: string | null
    endTime: string | null
  }>,
  externalEvents: ExternalCalendarEvent[],
): CalendarCombinedEvent[] {
  return [
    ...localEvents.map((event) => ({
      ...event,
      source: "LOCAL" as const,
      calendarUrl: null,
      calendarName: null,
      calendarColor: null,
    })),
    ...externalEvents,
  ].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if ((a.startTime ?? "") !== (b.startTime ?? "")) return (a.startTime ?? "").localeCompare(b.startTime ?? "")
    return a.title.localeCompare(b.title)
  })
}

export function eventSpansDate(event: { date: string; endDate: string | null }, date: string): boolean {
  const end = event.endDate ?? event.date
  return event.date <= date && end >= date
}
