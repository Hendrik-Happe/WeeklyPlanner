import Link from "next/link"
import { notFound } from "next/navigation"

const legal = {
  ownerName: process.env.NEXT_PUBLIC_LEGAL_OWNER_NAME ?? "[Vor- und Nachname]",
  street: process.env.NEXT_PUBLIC_LEGAL_STREET ?? "[Straße Hausnummer]",
  postalCode: process.env.NEXT_PUBLIC_LEGAL_POSTAL_CODE ?? "[PLZ]",
  city: process.env.NEXT_PUBLIC_LEGAL_CITY ?? "[Ort]",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "[E-Mail]",
}

export const metadata = {
  title: "Impressum",
}

export default function ImpressumPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEGAL_PAGES !== "true") {
    notFound()
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Impressum</h1>

      <section className="space-y-3 text-sm leading-6 text-gray-800">
        <p>
          Angaben gemaess Paragraf 5 DDG
        </p>

        <p>
          {legal.ownerName}
          <br />
          {legal.street}
          <br />
          {legal.postalCode} {legal.city}
        </p>

        <p>
          Kontakt:
          <br />
          E-Mail: {legal.email}
        </p>

        <p className="text-gray-600">
          Hinweis: Diese Seite wird privat betrieben. Sobald das Angebot ueber den rein persoenlichen
          oder familiaeren Bereich hinausgeht oder aus dem Internet fuer Dritte erreichbar ist,
          koennen Impressumspflichten bestehen.
        </p>
      </section>

      <div className="mt-8 text-sm">
        <Link href="/datenschutz" className="text-blue-600 hover:underline">
          Zur Datenschutzerklaerung
        </Link>
      </div>
    </main>
  )
}
