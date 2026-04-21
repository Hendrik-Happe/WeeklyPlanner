#!/bin/bash
set -e

echo ""
echo "🚀  WeeklyPlaner – Setup wird gestartet..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

touch .env

ensure_env_var() {
  KEY="$1"
  VALUE="$2"
  if ! grep -q "^${KEY}=" .env 2>/dev/null; then
    echo "${KEY}=${VALUE}" >> .env
  fi
}

ensure_env_var "NEXT_PUBLIC_APP_NAME" '"WeeklyPlaner"'
ensure_env_var "NEXT_PUBLIC_APP_SHORT_NAME" '"WeeklyPlaner"'
ensure_env_var "NEXT_PUBLIC_APP_DESCRIPTION" '"Familien-Wochenplaner"'
ensure_env_var "NEXT_PUBLIC_APP_THEME_COLOR" '"#3b82f6"'
ensure_env_var "NEXT_PUBLIC_APP_BACKGROUND_COLOR" '"#f9fafb"'
ensure_env_var "NEXT_PUBLIC_APP_START_URL" '"/day"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_TEXT" '"W"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_BG_START" '"#2563eb"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_BG_END" '"#1d4ed8"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_ACCENT" '"#3b82f6"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_ACCENT_SOFT" '"#93c5fd"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_PANEL" '"#ffffff"'
ensure_env_var "NEXT_PUBLIC_APP_ICON_PANEL_SOFT" '"#bfdbfe"'

# AUTH_SECRET generieren falls noch nicht vorhanden
if ! grep -q "^AUTH_SECRET=" .env 2>/dev/null; then
  echo "🔑  AUTH_SECRET wird generiert..."
  SECRET=$(openssl rand -base64 32)
  echo "AUTH_SECRET=$SECRET" >> .env
  echo "    ✓ AUTH_SECRET gesetzt"
fi

echo ""
echo "📦  Abhängigkeiten werden installiert..."
npm install

echo ""
echo "🗄️   Datenbank wird eingerichtet..."
npx prisma generate
npx prisma db push

echo ""
echo "🌱  Datenbank wird befüllt..."
npx tsx scripts/seed.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅  Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "  Entwicklung  →  npm run dev"
echo "  Produktion   →  npm run build && npm start"
echo ""
echo "Öffne http://localhost:3000 im Browser."
echo ""
