import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createUser, adminResetPin } from "@/app/(app)/actions"

export default async function AdminPage() {
  const session = await auth()
  if (session?.user.role !== "ADMIN") redirect("/day")

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" },
  })

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Nutzerverwaltung</h1>

      <section className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <h2 className="font-semibold mb-3">Neuer Nutzer</h2>
        <form action={createUser} className="space-y-3">
          <input
            name="username"
            placeholder="Benutzername"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="pin"
            type="password"
            placeholder="PIN (mind. 4 Zeichen)"
            inputMode="numeric"
            required
            minLength={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="role"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USER">Nutzer</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg py-2.5 font-semibold transition-colors"
          >
            Nutzer anlegen
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Alle Nutzer ({users.length})</h2>
        <div className="space-y-2">
          {users.map((user: { id: string; username: string; role: string }) => (
            <details
              key={user.id}
              className="bg-white rounded-xl border border-gray-100"
            >
              <summary className="p-3 flex justify-between items-center cursor-pointer list-none">
                <span className="font-medium">{user.username}</span>
                <span
                  className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${
                    user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {user.role}
                </span>
              </summary>
              <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500 mb-2">PIN zurücksetzen für {user.username}</p>
                <form action={adminResetPin} className="flex gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    name="newPin"
                    type="password"
                    placeholder="Neuer PIN"
                    inputMode="numeric"
                    required
                    minLength={4}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-gray-700 hover:bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Setzen
                  </button>
                </form>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
