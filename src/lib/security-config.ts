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

export function getPinMinLength(): number {
  return Math.max(4, envNumber("AUTH_PIN_MIN_LENGTH", 6))
}

export function isPinNumericOnlyEnabled(): boolean {
  return envBoolean("AUTH_PIN_NUMERIC_ONLY", true)
}

export function isValidPinFormat(pin: string): boolean {
  if (pin.length < getPinMinLength()) return false
  if (isPinNumericOnlyEnabled() && !/^\d+$/.test(pin)) return false
  return true
}

export function getPinRuleText(): string {
  const minLength = getPinMinLength()
  if (isPinNumericOnlyEnabled()) {
    return `PIN muss mindestens ${minLength} Ziffern enthalten`
  }
  return `PIN muss mindestens ${minLength} Zeichen enthalten`
}
