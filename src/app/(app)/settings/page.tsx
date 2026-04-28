import { getCurrentSession, signOut } from "@/lib/auth"
import ChangePinForm from "@/components/ChangePinForm"
import { redirect } from "next/navigation"
import { getCalendarSyncSettingsView } from "@/lib/calendar"
import {
  disconnectNextcloudOAuth,
  refreshNextcloudSharedCalendars,
  saveCalendarSyncSettings,
  updateSelectedNextcloudCalendars,
} from "@/app/(app)/actions"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ nextcloud_oauth?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect("/login")
  const { nextcloud_oauth: oauthStatus } = await searchParams
  const { sync: calendarSync, discoveredCalendars, selectedCalendarUrls } = await getCalendarSyncSettingsView(
    session.user.id,
  )
  const oauthConnected = Boolean(calendarSync?.oauthAccessToken)
  const oauthConfigured = Boolean(
    process.env.NEXTCLOUD_OAUTH_CLIENT_ID && process.env.NEXTCLOUD_OAUTH_CLIENT_SECRET,
  )
  const nextcloudServerFromEnv = process.env.NEXTCLOUD_SERVER_URL?.trim() || ""

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Einstellungen</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-4">
        <p className="text-sm text-gray-500 mb-4">
          Angemeldet als <span className="font-semibold text-gray-800">{session.user.name}</span>
        </p>

        <h2 className="font-semibold mb-3">Passwort ändern</h2>
        <ChangePinForm />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-4">
        <h2 className="font-semibold mb-2">Kalender-Sync (optional)</h2>
        <p className="text-sm text-gray-500 mb-3">
          Standard: Einmal mit Nextcloud verbinden. Die Kalender-URL wird danach automatisch gesetzt.
        </p>

        {oauthStatus === "connected" && (
          <p className="text-sm text-green-700 mb-3">Nextcloud erfolgreich verbunden.</p>
        )}
        {oauthStatus && oauthStatus !== "connected" && (
          <p className="text-sm text-amber-700 mb-3">
            OAuth-Verbindung fehlgeschlagen ({oauthStatus}). Bitte erneut versuchen.
          </p>
        )}

        {!oauthConfigured && (
          <p className="text-sm text-amber-700 mb-3">
            OAuth ist noch nicht konfiguriert. Bitte in .env zuerst NEXTCLOUD_OAUTH_CLIENT_ID und
            NEXTCLOUD_OAUTH_CLIENT_SECRET setzen.
          </p>
        )}

        <form action="/api/nextcloud/oauth/start" method="get" className="space-y-3 mb-4">
          {nextcloudServerFromEnv ? (
            <>
              <input type="hidden" name="serverUrl" value={nextcloudServerFromEnv} />
              <p className="text-xs text-gray-500">
                Server aus .env: {nextcloudServerFromEnv}
              </p>
            </>
          ) : (
            <input
              type="url"
              name="serverUrl"
              required
              defaultValue={calendarSync?.nextcloudServerUrl ?? ""}
              placeholder="https://nextcloud.example"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
          <button
            type="submit"
            disabled={!oauthConfigured}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            {oauthConnected ? "Nextcloud neu verbinden" : "Mit Nextcloud verbinden"}
          </button>
        </form>

        {oauthConnected && (
          <form action={disconnectNextcloudOAuth} className="mb-4">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Nextcloud-Verbindung trennen
            </button>
          </form>
        )}

        <details className="mt-3 mb-3">
          <summary className="text-sm text-gray-600 cursor-pointer select-none">
            Geteilte Kalender (optional)
          </summary>
          <div className="mt-3 space-y-3">
            {!oauthConnected ? (
              <p className="text-xs text-gray-500">
                Sobald Nextcloud verbunden ist, kannst du hier geteilte Kalender laden und auswählen.
              </p>
            ) : (
              <>
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
                      const checked = selectedCalendarUrls.includes(calendar.url)
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
                            defaultChecked={checked}
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
                      Auswahl speichern
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </details>

        <details className="mt-3">
          <summary className="text-sm text-gray-600 cursor-pointer select-none">
            Erweiterte Einstellungen (nur bei Sonderfällen)
          </summary>
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-3">
              Nur nötig, wenn deine Nextcloud vom Standard abweicht oder OAuth nicht verfügbar ist.
            </p>

            <form action={saveCalendarSyncSettings} className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={calendarSync?.enabled ?? false}
                />
                Nextcloud-Sync aktivieren
              </label>

              <input
                type="url"
                name="nextcloudServerUrl"
                defaultValue={calendarSync?.nextcloudServerUrl ?? ""}
                placeholder="https://nextcloud.example"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />

              <input
                type="url"
                name="nextcloudIcsUrl"
                defaultValue={calendarSync?.nextcloudIcsUrl ?? ""}
                placeholder="https://nextcloud.example/remote.php/dav/calendars/USER/personal/"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />

              <input
                type="text"
                name="nextcloudUsername"
                defaultValue={calendarSync?.nextcloudUsername ?? ""}
                placeholder="Nextcloud-Benutzername"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />

              {calendarSync?.nextcloudAppPassword ? (
                <input type="hidden" name="keepNextcloudAppPassword" value="1" />
              ) : null}
              <input
                type="password"
                name="nextcloudAppPassword"
                placeholder={calendarSync?.nextcloudAppPassword ? "App-Passwort gesetzt (leer lassen, um zu behalten)" : "Nextcloud-App-Passwort"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Erweiterte Sync-Einstellungen speichern
              </button>
            </form>
          </div>
        </details>
      </div>

      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
      >
        <button
          type="submit"
          className="w-full border border-red-200 text-red-500 hover:bg-red-50 rounded-lg py-3 font-semibold text-base transition-colors"
        >
          Abmelden
        </button>
      </form>
    </div>
  )
}
