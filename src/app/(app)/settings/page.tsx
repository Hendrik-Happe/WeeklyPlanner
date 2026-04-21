import { getCurrentSession, signOut } from "@/lib/auth"
import ChangePinForm from "@/components/ChangePinForm"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const session = await getCurrentSession()
  if (!session) redirect("/login")

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Einstellungen</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-4">
        <p className="text-sm text-gray-500 mb-4">
          Angemeldet als <span className="font-semibold text-gray-800">{session.user.name}</span>
        </p>

        <h2 className="font-semibold mb-3">PIN ändern</h2>
        <ChangePinForm />
      </div>

      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
      >
        <button
          type="submit"
          className="w-full border border-red-200 text-red-500 hover:bg-red-50 rounded-lg py-3 font-semibold text-base transition-colors"
        >
          Abmelden
        </button>
      </form>
    </div>
  )
}
