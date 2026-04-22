"use client"

import { useEffect, useMemo, useState } from "react"

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function isiOS() {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isAndroid() {
  if (typeof navigator === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function InstallPrompt({ appName }: { appName: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [standalone, setStandalone] = useState(true)

  useEffect(() => {
    setStandalone(isInStandaloneMode())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as DeferredInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null)
      setStandalone(true)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const showIOSHint = useMemo(() => !standalone && !dismissed && !deferredPrompt && isiOS(), [standalone, dismissed, deferredPrompt])
  const showAndroidFallbackHint = useMemo(
    () => !standalone && !dismissed && !deferredPrompt && isAndroid() && !isiOS(),
    [standalone, dismissed, deferredPrompt]
  )
  const showInstallButton = useMemo(() => !standalone && !dismissed && !!deferredPrompt, [standalone, dismissed, deferredPrompt])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (!showIOSHint && !showAndroidFallbackHint && !showInstallButton) return null

  return (
    <div className="fixed left-4 right-4 bottom-24 z-[90] mx-auto max-w-md rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{appName} installieren</p>
          {showInstallButton ? (
            <p className="mt-1 text-xs text-gray-600">Installiere die App für schnelleren Zugriff direkt vom Startbildschirm.</p>
          ) : showAndroidFallbackHint ? (
            <p className="mt-1 text-xs text-gray-600">In diesem Browser gibt es keinen automatischen Install-Dialog. Über das Browser-Menü und "Zum Startbildschirm hinzufügen" als App installieren.</p>
          ) : (
            <p className="mt-1 text-xs text-gray-600">Auf dem iPhone/iPad über Teilen → "Zum Home-Bildschirm" als App hinzufügen.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-sm text-gray-400 hover:text-gray-600"
          aria-label="Installationshinweis schließen"
        >
          ×
        </button>
      </div>

      {showInstallButton && (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Jetzt installieren
        </button>
      )}
    </div>
  )
}