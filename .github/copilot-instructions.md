# WeeklyPlaner – Projekt-Richtlinien

Familienbasierte Wochenplaner-App. Läuft auf einem Raspberry Pi, primär Mobile-Browser, auch Desktop.

## Stack

| Schicht | Technologie |
|---------|-------------|
| Framework | **Next.js 15** (App Router) + **TypeScript** |
| Styling | **Tailwind CSS v4** – Mobile-first |
| Datenbank | **SQLite** via **Prisma ORM** |
| Auth | **NextAuth.js v5** – Credentials Provider (Username + PIN) |
| PWA | **next-pwa** – installierbar auf Smartphones |
| Deployment | `next start` direkt auf Raspberry Pi |

## Architektur

```
src/
  app/                  # Next.js App Router
    (auth)/             # Login-Seiten (nicht geschützt)
    (app)/              # Geschützte Routen (Layout mit Nav)
      day/              # Tagesansicht
      week/             # Wochenansicht
      my-tasks/         # Meine Aufgaben
      tasks/new/        # Aufgabe anlegen
      admin/            # Admin-Bereich (Nutzerverwaltung)
    api/                # Route Handlers
  components/           # Wiederverwendbare UI-Komponenten
  lib/
    prisma.ts           # Prisma Client (Singleton)
    auth.ts             # NextAuth Konfiguration
  types/                # TypeScript-Typen
prisma/
  schema.prisma         # Datenbankschema
  dev.db                # SQLite-Datenbankdatei (gitignore)
```

## Datenmodell (Kern)

- **User**: id, username, pinHash, role (`USER` | `ADMIN`)
- **Task**: id, title, description, createdBy, assignedTo (nullable)
- **RecurrenceRule**: taskId, type (`ONCE`|`DAILY`|`WEEKLY`|`MONTHLY`), interval, weekdays (JSON), monthRange (`{from, to}` für April–September etc.), validFrom, validUntil
- **TaskCompletion**: taskId, userId, date, status (`DONE`|`SNOOZED`), snoozedTo

## Konventionen

- **Server Components by default** – `"use client"` nur wenn nötig (Interaktivität, Hooks)
- **Server Actions** für Formulare (Aufgabe erstellen, als erledigt markieren etc.)
- Datenbankzugriff **nur in Server Components oder Route Handlers** – niemals im Client
- PINs werden mit **bcrypt** gehasht (niemals Klartext speichern)
- Datumslogik immer in der **Europe/Berlin** Zeitzone (Raspberry Pi Systemzeit)
- Wiederholungsregeln werden **zur Laufzeit aufgelöst** – keine vorab generierten Datensätze pro Tag

## Auth & Rollen

- Nicht angemeldete Nutzer werden auf `/login` weitergeleitet (Middleware)
- `role: USER` – kann eigene Aufgaben erstellen, sich selbst Aufgaben zuweisen, als erledigt markieren, auf nächsten Tag verschieben
- `role: ADMIN` – zusätzlich: Aufgaben anderen Nutzern zuweisen, neue Nutzer anlegen (`/admin`)

## Build & Dev

```bash
npm install
npx prisma generate
npx prisma db push      # Erstellt dev.db
npm run dev             # Entwicklungsserver
npm run build && npm start  # Produktion (Raspberry Pi)
```

## Wichtige Besonderheiten

- **Wiederholungslogik**: Die Funktion `getTasksForDate(date)` berechnet, ob eine Aufgabe an einem gegebenen Datum aktiv ist. Sie prüft: Wochentag, Intervall, Monatsbereich (monthRange), validFrom/validUntil.
- **Snooze-Feature**: Verschobene Aufgaben erscheinen am Folgetag zusätzlich in der Tagesansicht.
- **Mobile-first**: Touch-freundliche Zielgrößen (min. 44px), bottom navigation bar auf Mobile.
- Kein E-Mail-Versand – rein lokale Nutzung im Heimnetz.
