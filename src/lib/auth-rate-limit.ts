import { prisma } from "@/lib/prisma"

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

function envBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name]
  if (!raw) return fallback
  const normalized = raw.trim().toLowerCase()
  if (["1", "true", "yes", "on"].includes(normalized)) return true
  if (["0", "false", "no", "off"].includes(normalized)) return false
  return fallback
}

function nowMs(): number {
  return Date.now()
}

function nowDate(): Date {
  return new Date()
}

function windowMs(): number {
  return envNumber("AUTH_RATE_LIMIT_WINDOW_SECONDS", 300) * 1000
}

function maxAttempts(): number {
  return envNumber("AUTH_RATE_LIMIT_MAX_ATTEMPTS", 5)
}

function blockMs(): number {
  return envNumber("AUTH_RATE_LIMIT_BLOCK_SECONDS", 900) * 1000
}

export function isAuthRateLimitEnabled(): boolean {
  return envBoolean("AUTH_RATE_LIMIT_ENABLED", true)
}

export function shouldTrustProxyHeaders(): boolean {
  return envBoolean("AUTH_TRUST_PROXY_HEADERS", false)
}

export function authRateLimitKey(username: string, ip: string): string {
  return `${username.toLowerCase()}|${ip}`
}

export async function isAuthBlocked(key: string): Promise<boolean> {
  if (!isAuthRateLimitEnabled()) return false

  const bucket = await prisma.authRateLimit.findUnique({ where: { key } })
  if (!bucket) return false

  const now = nowDate()
  if (bucket.blockedUntil && bucket.blockedUntil > now) return true

  if (now.getTime() - bucket.firstAttemptAt.getTime() > windowMs()) {
    await prisma.authRateLimit.delete({ where: { key } })
    return false
  }

  return false
}

export async function registerAuthFailure(key: string): Promise<void> {
  if (!isAuthRateLimitEnabled()) return

  const now = nowDate()
  const winMs = windowMs()
  const max = maxAttempts()
  const blockDuration = blockMs()

  const existing = await prisma.authRateLimit.findUnique({ where: { key } })
  if (!existing || now.getTime() - existing.firstAttemptAt.getTime() > winMs) {
    await prisma.authRateLimit.upsert({
      where: { key },
      create: {
        key,
        attempts: 1,
        firstAttemptAt: now,
        blockedUntil: null,
      },
      update: {
      attempts: 1,
        firstAttemptAt: now,
        blockedUntil: null,
      },
    })
    return
  }

  const attempts = existing.attempts + 1
  const blockedUntil = attempts >= max
    ? new Date(now.getTime() + blockDuration)
    : existing.blockedUntil

  await prisma.authRateLimit.update({
    where: { key },
    data: {
      attempts,
      blockedUntil,
    },
  })
}

export async function clearAuthRateLimit(key: string): Promise<void> {
  if (!isAuthRateLimitEnabled()) return
  await prisma.authRateLimit.deleteMany({ where: { key } })
}
