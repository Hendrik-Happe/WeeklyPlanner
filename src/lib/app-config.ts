function readString(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized ? normalized : fallback
}

export const appConfig = {
  name: readString(process.env.NEXT_PUBLIC_APP_NAME, "WeeklyPlaner"),
  shortName: readString(process.env.NEXT_PUBLIC_APP_SHORT_NAME, "WeeklyPlaner"),
  description: readString(process.env.NEXT_PUBLIC_APP_DESCRIPTION, "Familien-Wochenplaner"),
  themeColor: readString(process.env.NEXT_PUBLIC_APP_THEME_COLOR, "#3b82f6"),
  backgroundColor: readString(process.env.NEXT_PUBLIC_APP_BACKGROUND_COLOR, "#f9fafb"),
  startUrl: readString(process.env.NEXT_PUBLIC_APP_START_URL, "/day"),
  iconText: readString(process.env.NEXT_PUBLIC_APP_ICON_TEXT, "W").slice(0, 2),
  iconBgStart: readString(process.env.NEXT_PUBLIC_APP_ICON_BG_START, "#2563eb"),
  iconBgEnd: readString(process.env.NEXT_PUBLIC_APP_ICON_BG_END, "#1d4ed8"),
  iconAccent: readString(process.env.NEXT_PUBLIC_APP_ICON_ACCENT, "#3b82f6"),
  iconAccentSoft: readString(process.env.NEXT_PUBLIC_APP_ICON_ACCENT_SOFT, "#93c5fd"),
  iconPanel: readString(process.env.NEXT_PUBLIC_APP_ICON_PANEL, "#ffffff"),
  iconPanelSoft: readString(process.env.NEXT_PUBLIC_APP_ICON_PANEL_SOFT, "#bfdbfe"),
}