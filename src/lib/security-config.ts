function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

export function getPinMinLength(): number {
  return Math.max(4, envNumber("AUTH_PIN_MIN_LENGTH", 6))
}
