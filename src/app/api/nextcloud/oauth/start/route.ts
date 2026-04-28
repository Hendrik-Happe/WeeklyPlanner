import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import { NextResponse } from "next/server"

function normalizeServerUrl(raw: string): string {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error("Ungültige Nextcloud-Server-URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Ungültige Nextcloud-Server-URL")
  }

  parsed.pathname = ""
  parsed.search = ""
  parsed.hash = ""
  return parsed.toString().replace(/\/$/, "")
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const clientId = process.env.NEXTCLOUD_OAUTH_CLIENT_ID
  const clientSecret = process.env.NEXTCLOUD_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=missing_client", request.url))
  }

  const reqUrl = new URL(request.url)
  const serverUrlRaw =
    reqUrl.searchParams.get("serverUrl")?.trim() ||
    process.env.NEXTCLOUD_SERVER_URL?.trim()
  if (!serverUrlRaw) {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=missing_server", request.url))
  }

  let serverUrl: string
  try {
    serverUrl = normalizeServerUrl(serverUrlRaw)
  } catch {
    return NextResponse.redirect(new URL("/settings?nextcloud_oauth=invalid_server", request.url))
  }

  const state = randomBytes(24).toString("hex")
  const stateExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.calendarSyncSetting.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      nextcloudServerUrl: serverUrl,
      enabled: true,
      oauthState: state,
      oauthStateExpiresAt: stateExpiresAt,
    },
    update: {
      nextcloudServerUrl: serverUrl,
      enabled: true,
      oauthState: state,
      oauthStateExpiresAt: stateExpiresAt,
    },
  })

  const callbackUrl = new URL("/api/nextcloud/oauth/callback", request.url)
  const authorizeUrl = new URL("/apps/oauth2/authorize", serverUrl)
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl.toString())
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("state", state)

  return NextResponse.redirect(authorizeUrl)
}
