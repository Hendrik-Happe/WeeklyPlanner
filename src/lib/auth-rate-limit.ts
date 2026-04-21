type Bucket = {
  attempts: number
  firstAttemptAt: number
  blockedUntil: number
}

const buckets = new Map<string, Bucket>()

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

export function authRateLimitKey(username: string, ip: string): string {
  return `${username.toLowerCase()}|${ip}`
}

export function isAuthBlocked(key: string): boolean {
  if (!isAuthRateLimitEnabled()) return false

  const bucket = buckets.get(key)
  if (!bucket) return false

  const now = nowMs()
  if (bucket.blockedUntil > now) return true

  if (now - bucket.firstAttemptAt > windowMs()) {
    buckets.delete(key)
    return false
  }

  return false
}

export function registerAuthFailure(key: string): void {
  if (!isAuthRateLimitEnabled()) return

  const now = nowMs()
  const winMs = windowMs()
  const max = maxAttempts()
  const blockDuration = blockMs()

  const existing = buckets.get(key)
  if (!existing || now - existing.firstAttemptAt > winMs) {
    buckets.set(key, {
      attempts: 1,
      firstAttemptAt: now,
      blockedUntil: 0,
    })
    return
  }

  existing.attempts += 1
  if (existing.attempts >= max) {
    existing.blockedUntil = now + blockDuration
  }
  buckets.set(key, existing)
}

export function clearAuthRateLimit(key: string): void {
  if (!isAuthRateLimitEnabled()) return
  buckets.delete(key)
}
