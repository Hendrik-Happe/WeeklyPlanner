import Link from "next/link"
import { notFound } from "next/navigation"
import { WEBSITE_VERSION } from "@/lib/app-version"

const legal = {
  ownerName: process.env.NEXT_PUBLIC_LEGAL_OWNER_NAME ?? "[Vor- und Nachname]",
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "[E-Mail]",
}

export const metadata = {
  title: "Datenschutz",
}

export default function DatenschutzPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_LEGAL_PAGES !== "true") {
    notFound()
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Datenschutzerklaerung</h1>

      <section className="space-y-4 text-sm leading-6 text-gray-800">
        <p>
          Diese Website wird privat auf einem eigenen Server betrieben.
        </p>

        <p>
          Verantwortliche Person:
          <br />
          {legal.ownerName}
        </p>

        <p>
          Kontakt fuer Datenschutzanfragen:
          <br />
          {legal.email}
        </p>

        <h2 className="text-base font-semibold pt-3">Verarbeitete Daten</h2>
        <p>
          Bei der Nutzung der Anwendung werden insbesondere folgende Daten verarbeitet:
          Benutzername, Authentifizierungsdaten (gehashtes Passwort), Sitzungsdaten,
          sowie technisch erforderliche Sicherheitsdaten zur Missbrauchserkennung
          (z. B. IP-bezogene Rate-Limit-Informationen).
        </p>

        <h2 className="text-base font-semibold pt-3">Zweck der Verarbeitung</h2>
        <p>
          Bereitstellung der Anwendung, Zugriffsschutz, Verwaltung von Aufgaben,
          Mahlzeiten und Einkaufslisten sowie Sicherstellung der IT-Sicherheit.
        </p>

        <h2 className="text-base font-semibold pt-3">Cookies</h2>
        <p>
          Es werden technisch notwendige Cookies fuer Anmeldung und Sitzung verwendet.
          Es werden keine Tracking- oder Marketing-Cookies eingesetzt.
        </p>

        <h2 className="text-base font-semibold pt-3">Empfaenger und Weitergabe</h2>
        <p>
          Es erfolgt keine Weitergabe personenbezogener Daten an Dritte zu Werbe- oder
          Analysezwecken. Eine Verarbeitung erfolgt auf dem eigenen Server.
        </p>

        <h2 className="text-base font-semibold pt-3">Speicherdauer</h2>
        <p>
          Daten werden gespeichert, solange dies fuer den Betrieb der Anwendung erforderlich ist
          oder gesetzliche Aufbewahrungspflichten bestehen.
        </p>

        <h2 className="text-base font-semibold pt-3">Ihre Rechte</h2>
        <p>
          Sie haben nach DSGVO insbesondere Rechte auf Auskunft, Berichtigung, Loeschung,
          Einschraenkung der Verarbeitung sowie Beschwerde bei einer Aufsichtsbehoerde.
        </p>

        <p className="text-gray-600">
          Dieser Text ist eine technische Vorlage und ersetzt keine individuelle Rechtsberatung.
        </p>

        <p className="text-gray-600">Version der Webseite: {WEBSITE_VERSION}</p>
      </section>

      <div className="mt-8 text-sm">
        <Link href="/impressum" className="text-blue-600 hover:underline">
          Zum Impressum
        </Link>
      </div>
    </main>
  )
}
