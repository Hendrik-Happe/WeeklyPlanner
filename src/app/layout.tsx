import type { Metadata, Viewport } from "next"
import OnlineOnlyGuard from "@/components/OnlineOnlyGuard"
import { appConfig } from "@/lib/app-config"
import { WEBSITE_VERSION } from "@/lib/app-version"
import "./globals.css"

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  applicationName: appConfig.name,
  other: {
    "x-app-version": WEBSITE_VERSION,
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appConfig.shortName,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: appConfig.themeColor,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 text-gray-900">
        <OnlineOnlyGuard />
        <div className="fixed right-2 top-2 z-50 rounded bg-white/75 px-2 py-0.5 text-[10px] text-gray-500 backdrop-blur-sm">
          v{WEBSITE_VERSION}
        </div>
        {children}
      </body>
    </html>
  )
}
