function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.floor(parsed)
}

export function getPasswordMinLength(): number {
  return Math.max(
    4,
    envNumber("AUTH_PASSWORD_MIN_LENGTH", envNumber("AUTH_PIN_MIN_LENGTH", 6)),
  )
}

export function isValidPasswordFormat(password: string): boolean {
  if (password.length < getPasswordMinLength()) return false
  return true
}

export function getPasswordRuleText(): string {
  const minLength = getPasswordMinLength()
  return `Passwort muss mindestens ${minLength} Zeichen enthalten`
}

export const getPinMinLength = getPasswordMinLength
export const isValidPinFormat = isValidPasswordFormat
export const getPinRuleText = getPasswordRuleText
