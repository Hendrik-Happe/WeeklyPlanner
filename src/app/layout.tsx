import type { Metadata, Viewport } from "next"
import OnlineOnlyGuard from "@/components/OnlineOnlyGuard"
import { appConfig } from "@/lib/app-config"
import "./globals.css"

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
  applicationName: appConfig.name,
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
        {children}
      </body>
    </html>
  )
}
