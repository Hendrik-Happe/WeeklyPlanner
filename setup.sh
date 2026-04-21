#!/bin/bash
set -e

echo ""
echo "🚀  WeeklyPlaner – Setup wird gestartet..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

touch .env

get_env_var() {
  KEY="$1"
  DEFAULT="$2"
  CURRENT=$(grep -E "^${KEY}=" .env 2>/dev/null | tail -n 1 | cut -d '=' -f2-)

  if [ -n "$CURRENT" ]; then
    echo "$CURRENT"
  else
    echo "$DEFAULT"
  fi
}

ensure_env_var() {
  KEY="$1"
  VALUE="$2"
  if ! grep -q "^${KEY}=" .env 2>/dev/null; then
    echo "${KEY}=${VALUE}" >> .env
  fi
}

set_env_var() {
  KEY="$1"
  VALUE="$2"

  if grep -q "^${KEY}=" .env 2>/dev/null; then
    sed -i "s|^${KEY}=.*|${KEY}=${VALUE}|" .env
  else
    echo "${KEY}=${VALUE}" >> .env
  fi
}

prompt_env_var() {
  KEY="$1"
  LABEL="$2"
  DEFAULT="$3"

  CURRENT=$(get_env_var "$KEY" "$DEFAULT")
  CURRENT=${CURRENT#\"}
  CURRENT=${CURRENT%\"}

  printf "%s [%s]: " "$LABEL" "$CURRENT"
  read -r INPUT

  if [ -z "$INPUT" ]; then
    INPUT="$CURRENT"
  fi

  set_env_var "$KEY" "\"$INPUT\""
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

if [ -t 0 ]; then
  echo ""
  echo "⚙️   App-Konfiguration"
  echo "Leer lassen, um den aktuellen/default Wert zu behalten."

  prompt_env_var "NEXT_PUBLIC_APP_NAME" "App-Name" "WeeklyPlaner"
  prompt_env_var "NEXT_PUBLIC_APP_SHORT_NAME" "Kurzer App-Name" "WeeklyPlaner"
  prompt_env_var "NEXT_PUBLIC_APP_DESCRIPTION" "Beschreibung" "Familien-Wochenplaner"
  prompt_env_var "NEXT_PUBLIC_APP_THEME_COLOR" "Themenfarbe" "#3b82f6"
  prompt_env_var "NEXT_PUBLIC_APP_BACKGROUND_COLOR" "Hintergrundfarbe" "#f9fafb"
  prompt_env_var "NEXT_PUBLIC_APP_START_URL" "Start-URL" "/day"
  prompt_env_var "NEXT_PUBLIC_APP_ICON_TEXT" "Icon-Text (1-2 Zeichen)" "W"

  echo ""
  printf "Erweiterte Icon-Farben konfigurieren? [j/N]: "
  read -r CONFIGURE_ICON_COLORS

  if [[ "$CONFIGURE_ICON_COLORS" =~ ^([jJ]|[jJ][aA])$ ]]; then
    prompt_env_var "NEXT_PUBLIC_APP_ICON_BG_START" "Icon Hintergrund Start" "#2563eb"
    prompt_env_var "NEXT_PUBLIC_APP_ICON_BG_END" "Icon Hintergrund Ende" "#1d4ed8"
    prompt_env_var "NEXT_PUBLIC_APP_ICON_ACCENT" "Icon Akzentfarbe" "#3b82f6"
    prompt_env_var "NEXT_PUBLIC_APP_ICON_ACCENT_SOFT" "Icon Akzentfarbe weich" "#93c5fd"
    prompt_env_var "NEXT_PUBLIC_APP_ICON_PANEL" "Icon Panel-Farbe" "#ffffff"
    prompt_env_var "NEXT_PUBLIC_APP_ICON_PANEL_SOFT" "Icon Panel-Farbe weich" "#bfdbfe"
  fi
fi

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
