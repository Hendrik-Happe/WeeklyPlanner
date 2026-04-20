import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import BottomNav from "@/components/BottomNav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav role={session.user.role} />
    </div>
  )
}
