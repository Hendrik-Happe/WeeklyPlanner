import type { Metadata, Viewport } from "next"
import OnlineOnlyGuard from "@/components/OnlineOnlyGuard"
import "./globals.css"

export const metadata: Metadata = {
  title: "WeeklyPlaner",
  description: "Familien-Wochenplaner",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
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
