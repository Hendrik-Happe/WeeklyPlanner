# WeeklyPlaner

Familienbasierte Wochenplaner-App für den Raspberry Pi. Verwaltet Aufgaben, Mahlzeiten und Einkaufslisten im Heimnetz. Primär für Mobile-Browser optimiert, funktioniert auch auf dem Desktop.

## Hinweis

Dieses Projekt wurde vollständig KI-generiert.

Es wird keine Haftung für Fehler, Funktionsstörungen, Datenverlust, Sicherheitslücken oder sonstige Schäden übernommen, die sich aus der Nutzung, dem Betrieb oder der Weiterentwicklung dieses Projekts ergeben.

Der Einsatz in produktiven oder öffentlich erreichbaren Umgebungen erfolgt auf eigenes Risiko. Vor einem produktiven Einsatz sollten insbesondere Code, Konfiguration, Authentifizierung, Rechtekonzepte und Sicherheitsmechanismen eigenständig geprüft und getestet werden.

---

## Inhaltsverzeichnis

- [Stack](#stack)
- [Features](#features)
- [Architektur](#architektur)
- [Datenmodell](#datenmodell)
- [Authentifizierung & Sicherheit](#authentifizierung--sicherheit)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Setup & Deployment](#setup--deployment)
- [Entwicklung](#entwicklung)

---

## Stack

| Schicht     | Technologie                                        |
|-------------|-----------------------------------------------------|
| Framework   | **Next.js 15** (App Router) + **TypeScript 5**     |
| Styling     | **Tailwind CSS v4** – Mobile-first                  |
| Datenbank   | **SQLite** via **Prisma ORM 6**                     |
| Auth        | **NextAuth.js v5** – Credentials Provider (Username + Passwort) |
| PWA         | **next-pwa** – installierbar auf Smartphones        |
| Deployment  | `next start` direkt auf Raspberry Pi               |

---

## Features

### Aufgaben
- Aufgaben erstellen mit optionaler Beschreibung
- Wiederholungsregeln: `ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`
  - Wochentage frei wählbar (z. B. Mo + Mi)
  - Intervall (z. B. alle 2 Wochen)
  - Monatsspanne (z. B. nur April–September, auch jahresübergreifend)
  - Gültigkeitszeitraum (`validFrom` / `validUntil`)
- Aufgaben als **erledigt** markieren oder auf den nächsten Tag **snoosen**
- Aufgaben anderen Nutzern zuweisen (ADMIN) oder tagweise zuweisen
- Private Aufgaben (nur für Ersteller und zugewiesenen Nutzer sichtbar)

### Mahlzeiten
- Rezepte anlegen mit Quellenangabe (`APP | BOOK | LINK`)
- Mahlzeitenplan pro Tag zuweisen
- Wochen-Übersicht des Mahlzeitenplans

### Einkaufslisten
- Mehrere Listen pro Nutzer
- Listen für alle freigeben (`isSharedWithAll`)
- Listen mit einzelnen Nutzern teilen
- Artikel mit Tags versehen
- Tag-Autovervollständigung aus Verlauf
- Listen- und Gitter-Ansicht wählbar (pro Nutzer gespeichert)

### PWA / Mobile
- Installierbar auf Android/iOS (Add to Home Screen)
- Bottom-Navigation-Leiste
- Touch-freundliche Zielgrößen (min. 44 px)
- Dynamisches App-Icon und Manifest vollständig über `.env` konfigurierbar

---

## Architektur

```
src/
  app/
    (auth)/login/         # Login-Seite (öffentlich)
    (app)/                # Geschützte Routen (Auth-Guard via Layout + Middleware)
      day/                # Tagesansicht
      week/               # Wochenansicht
      my-tasks/           # Eigene Aufgaben
      tasks/new/          # Aufgabe anlegen
      tasks/[id]/edit/    # Aufgabe bearbeiten
      meals/              # Mahlzeitenplan
      shopping/           # Einkaufslisten
      settings/           # Nutzereinstellungen (Passwort ändern)
      admin/              # Nutzerverwaltung (nur ADMIN)
      actions.ts          # Alle Server Actions (Datenmutationen)
    api/auth/[...nextauth]/  # NextAuth Route Handler
  components/             # Wiederverwendbare UI-Komponenten
  lib/
    auth.ts               # NextAuth-Konfiguration + getCurrentSession()
    auth-rate-limit.ts    # Login-Brute-Force-Schutz (DB-backed)
    security-config.ts    # Passwort-Policy (Mindestlänge, Format)
    prisma.ts             # Prisma Client Singleton
    tasks.ts              # Aufgaben-Logik + Wiederholungsauflösung
    meals.ts              # Mahlzeiten-Datenbankzugriffe
    shopping.ts           # Einkaufslisten-Datenbankzugriffe
    app-config.ts         # App-Branding aus Umgebungsvariablen
  types/
    next-auth.d.ts        # Typen-Erweiterungen für NextAuth Session/JWT
  middleware.ts           # Unauthentifizierte Anfragen → /login
prisma/
  schema.prisma           # Datenbankschema
  dev.db                  # SQLite-Datenbankdatei (nicht im Git)
scripts/
  seed.ts                 # Initialer Admin-Nutzer
setup.sh                  # Interaktives Ersteinrichtungs-Skript
```

### Wichtige Konventionen

- **Server Components by default** – `"use client"` nur bei Interaktivität / Hooks
- **Server Actions** für alle Datenmutationen (`src/app/(app)/actions.ts`)
- Datenbankzugriff **ausschließlich** in Server Components, Server Actions oder Route Handlers
- Alle geschützten Seiten verwenden `getCurrentSession()` statt `auth()` – validiert `sessionVersion` gegen die Datenbank
- Datumslogik immer in der Zeitzone **Europe/Berlin**
- Wiederholungsregeln werden **zur Laufzeit aufgelöst**, keine vorab generierten Datensätze

---

## Datenmodell

### User
| Feld             | Typ      | Beschreibung                                      |
|------------------|----------|---------------------------------------------------|
| `id`             | String   | CUID                                              |
| `username`       | String   | Eindeutig                                         |
| `passwordHash`   | String   | bcrypt-Hash (cost 12), gemappt auf bestehende Spalte `pinHash` |
| `role`           | Enum     | `USER` \| `ADMIN`                                 |
| `sessionVersion` | Int      | Erhöht bei Passwort-Änderung → alle Sessions ungültig |
| `shoppingView`   | String   | Bevorzugte Ansicht: `LIST` \| `GRID`              |

### Task
| Feld          | Typ    | Beschreibung                              |
|---------------|--------|-------------------------------------------|
| `title`       | String |                                           |
| `description` | String | Optional                                  |
| `isPrivate`   | Bool   | Nur für Ersteller + zugewiesenen Nutzer   |
| `createdById` | String | Pflichtfeld                               |
| `assignedToId`| String | Optional – globale Zuweisung              |

### RecurrenceRule (1:1 zu Task)
| Feld        | Typ    | Beschreibung                                        |
|-------------|--------|-----------------------------------------------------|
| `type`      | String | `ONCE` \| `DAILY` \| `WEEKLY` \| `MONTHLY`         |
| `interval`  | Int    | Wiederholungsintervall (Standard: 1)                |
| `weekdays`  | String | JSON-Array: `[1,3]` = Mo+Mi (0=So … 6=Sa)          |
| `monthFrom` | Int    | Monatsspanne-Start (1–12, inkl.)                    |
| `monthTo`   | Int    | Monatsspanne-Ende (1–12, inkl., jahresübergreifend) |
| `validFrom` | Date   | Frühestes Datum (bei `ONCE`: exaktes Datum)         |
| `validUntil`| Date   | Letztes Datum                                       |

### TaskCompletion
Speichert Erledigt/Snoozed-Status pro Aufgabe und Datum.

| Feld        | Typ    | Beschreibung                    |
|-------------|--------|---------------------------------|
| `status`    | String | `DONE` \| `SNOOZED`            |
| `snoozedTo` | String | ISO-Datum des Folgetags         |
| `date`      | String | ISO-Datum: `"YYYY-MM-DD"`       |

### TaskAssignment
Tagweise Zuweisung (überschreibt `Task.assignedToId` für einen einzelnen Tag).

### Recipe / MealPlan
Rezepte mit Quellentyp (`APP | BOOK | LINK`). Ein `MealPlan` verknüpft ein Rezept mit einem Datum.

### ShoppingList / ShoppingItem / ShoppingItemTag
Listen können öffentlich (`isSharedWithAll`) oder gezielt geteilt werden (`ShoppingListMember`). Artikel haben Tags mit Verlaufs-Autovervollständigung (`ShoppingTagHistory`).

### AuthRateLimit
DB-backed Brute-Force-Tracking pro `username|ip`-Schlüssel.

---

## Authentifizierung & Sicherheit

### Sitzungen
- JWT-Strategie mit **1 Jahr** Laufzeit (rolling, tägliche Erneuerung)
- `getCurrentSession()` validiert bei jedem Request:
  - Existiert der Nutzer noch in der DB?
  - Stimmt `sessionVersion` im Token mit der DB überein?
- Passwort-Änderung erhöht `sessionVersion` → alle bestehenden Sessions werden sofort ungültig

### Passwort-Policy
Gesteuert über Umgebungsvariablen:

| Variable              | Standard | Beschreibung                     |
|-----------------------|----------|----------------------------------|
| `AUTH_PASSWORD_MIN_LENGTH` | `6` | Mindestlänge (≥ 4 erzwungen)     |

### Login-Rate-Limiting
Persistiert in der Datenbank (Tabelle `AuthRateLimit`).

| Variable                       | Standard | Beschreibung                           |
|--------------------------------|----------|----------------------------------------|
| `AUTH_RATE_LIMIT_ENABLED`      | `true`   | Rate-Limiting ein-/ausschalten         |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `300`  | Zeitfenster für Fehlversuche (Sekunden) |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | `5`      | Max. Fehlversuche im Fenster           |
| `AUTH_RATE_LIMIT_BLOCK_SECONDS`| `900`    | Sperrdauer nach Überschreitung         |

**IP-Erkennung:** Ohne Reverse Proxy (`AUTH_TRUST_PROXY_HEADERS=false`) wird `"unknown"` als IP verwendet – Rate-Limiting dann nur nach `username|user-agent`. Bei aktivem Reverse Proxy `AUTH_TRUST_PROXY_HEADERS=true` setzen.

### Objektebene
Alle Task-Mutationen (`markDone`, `snoozeTask`, `claimTask`, `unclaimTask`) prüfen via `getAuthorizedTask()`, ob der Nutzer die Aufgabe sehen darf, bevor sie ausgeführt werden.

---

## Umgebungsvariablen

Alle Variablen in `.env` (Vorlage: `.env.example`):

```env
# Datenbank
DATABASE_URL="file:./dev.db"

# NextAuth (setup.sh generiert AUTH_SECRET automatisch)
AUTH_SECRET=

# Rate-Limiting
AUTH_RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_WINDOW_SECONDS=300
AUTH_RATE_LIMIT_MAX_ATTEMPTS=5
AUTH_RATE_LIMIT_BLOCK_SECONDS=900
AUTH_TRUST_PROXY_HEADERS=false

# Passwort-Policy
AUTH_PASSWORD_MIN_LENGTH=6

# Branding / PWA
NEXT_PUBLIC_APP_NAME="WeeklyPlaner"
NEXT_PUBLIC_APP_SHORT_NAME="WeeklyPlaner"
NEXT_PUBLIC_APP_DESCRIPTION="Familien-Wochenplaner"
NEXT_PUBLIC_APP_THEME_COLOR="#3b82f6"
NEXT_PUBLIC_APP_BACKGROUND_COLOR="#f9fafb"
NEXT_PUBLIC_APP_START_URL="/day"

# App-Icon (Text + Farben)
NEXT_PUBLIC_APP_ICON_TEXT="W"
NEXT_PUBLIC_APP_ICON_BG_START="#2563eb"
NEXT_PUBLIC_APP_ICON_BG_END="#1d4ed8"
```

---

## Setup & Deployment

### Ersteinrichtung (interaktiv)

```bash
bash setup.sh
```

Das Skript:
1. Prüft `node`, `npm`, `openssl`
2. Erstellt `.env` aus `.env.example` (überschreibt nicht)
3. Generiert `AUTH_SECRET` mit `openssl rand -base64 32`
4. Fragt nach Admin-Nutzername und Passwort
5. Führt `npx prisma generate && npx prisma db push` aus
6. Legt den Admin-Nutzer via `scripts/seed.ts` an

### Nicht-interaktiv (CI / erneutes Seeden)

```bash
SEED_ADMIN_USERNAME="admin" SEED_ADMIN_PASSWORD="meinpasswort" npm run setup
```

### Produktion starten

```bash
npm run build
npm start
```

### Nach Schema-Änderungen

```bash
npx prisma db push        # Schema auf DB anwenden
npx prisma generate       # Prisma Client neu generieren
```

---

## Entwicklung

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Nützliche Befehle

```bash
npm run lint              # ESLint
npx tsc --noEmit          # TypeScript-Prüfung ohne Build
npx prisma studio         # Datenbank-Browser (GUI)
```

### Rollen

| Rolle   | Berechtigungen                                                                          |
|---------|-----------------------------------------------------------------------------------------|
| `USER`  | Eigene Aufgaben erstellen, Aufgaben erledigen/snoosen, Passwort ändern                    |
| `ADMIN` | Zusätzlich: Aufgaben anderen zuweisen, neue Nutzer anlegen, Passwörter zurücksetzen (`/admin`) |
