import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function fetchNextcloudUserId(serverUrl: string, accessToken: string): Promise<string | null> {
  const url = new URL("/ocs/v2.php/cloud/user?format=json", serverUrl).toString()
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "OCS-APIRequest": "true",
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) return null

  const json = await response.json() as {
    ocs?: {
      data?: {
        id?: string
      }
    }
  }

  const id = json.ocs?.data?.id?.trim()
  return id || null
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

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const reqUrl = new URL(request.url)
  const code = reqUrl.searchParams.get("code")
  const state = reqUrl.searchParams.get("state")
  const oauthError = reqUrl.searchParams.get("error")

  if (oauthError) {
    return NextResponse.redirect(new URL(`/settings?nextcloud_oauth=denied&reason=${encodeURIComponent(oauthError)}`, request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=missing_code", request.url))
  }

  const sync = await prisma.calendarSyncSetting.findUnique({
    where: { userId: session.user.id },
    select: {
      nextcloudServerUrl: true,
      oauthState: true,
      oauthStateExpiresAt: true,
    },
  })

  if (!sync?.nextcloudServerUrl || !sync.oauthState || !sync.oauthStateExpiresAt) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=missing_state", request.url))
  }

  if (sync.oauthState !== state || sync.oauthStateExpiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=invalid_state", request.url))
  }

  const clientId = process.env.NEXTCLOUD_OAUTH_CLIENT_ID
  const clientSecret = process.env.NEXTCLOUD_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=missing_client", request.url))
  }

  const callbackUrl = new URL("/api/nextcloud/oauth/callback", request.url)
  const tokenEndpoint = new URL("/apps/oauth2/api/v1/token", sync.nextcloudServerUrl).toString()

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl.toString(),
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=token_failed", request.url))
  }

  const token = await response.json() as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
  }

  if (!token.access_token) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=token_invalid", request.url))
  }

  const expiresIn = typeof token.expires_in === "number" ? token.expires_in : 3600
  const expiresAt = new Date(Date.now() + Math.max(60, expiresIn - 30) * 1000)
  const defaultIcsUrl = process.env.NEXTCLOUD_DEFAULT_ICS_URL?.trim() || null
  const detectedNextcloudUserId = await fetchNextcloudUserId(sync.nextcloudServerUrl, token.access_token)
  const generatedIcsUrl =
    !defaultIcsUrl && detectedNextcloudUserId
      ? buildDefaultNextcloudCalendarUrl(sync.nextcloudServerUrl, detectedNextcloudUserId)
      : null

  await prisma.calendarSyncSetting.update({
    where: { userId: session.user.id },
    data: {
      enabled: true,
      oauthAccessToken: token.access_token,
      oauthRefreshToken: token.refresh_token ?? null,
      oauthTokenExpiresAt: expiresAt,
      oauthState: null,
      oauthStateExpiresAt: null,
      nextcloudIcsUrl: defaultIcsUrl ?? generatedIcsUrl,
      nextcloudUsername: detectedNextcloudUserId,
      // Legacy basic auth credentials can be cleared when OAuth is connected.
      nextcloudAppPassword: null,
    },
  })

  return NextResponse.redirect(new URL("/settings?nextcloud_oauth=connected", request.url))
}
