import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import BottomNav from "@/components/BottomNav"
import InstallPrompt from "@/components/InstallPrompt"
import { appConfig } from "@/lib/app-config"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <InstallPrompt appName={appConfig.shortName} />
      <BottomNav role={session.user.role} />
    </div>
  )
}
