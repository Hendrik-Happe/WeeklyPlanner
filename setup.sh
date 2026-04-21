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

prompt_secret() {
  LABEL="$1"
  VALUE=""

  while [ -z "$VALUE" ]; do
    printf "%s: " "$LABEL"
    read -r -s VALUE
    echo ""
  done

  echo "$VALUE"
}

ADMIN_USERNAME="${SEED_ADMIN_USERNAME:-}"
ADMIN_PASSWORD="${SEED_ADMIN_PASSWORD:-${SEED_ADMIN_PIN:-}}"

PASSWORD_MIN_LENGTH=$(get_env_var "AUTH_PASSWORD_MIN_LENGTH" "$(get_env_var "AUTH_PIN_MIN_LENGTH" "6")")
if ! [[ "$PASSWORD_MIN_LENGTH" =~ ^[0-9]+$ ]] || [ "$PASSWORD_MIN_LENGTH" -lt 4 ]; then
  PASSWORD_MIN_LENGTH=6
fi

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
ensure_env_var "AUTH_PASSWORD_MIN_LENGTH" "$PASSWORD_MIN_LENGTH"
ensure_env_var "AUTH_RATE_LIMIT_ENABLED" "true"
ensure_env_var "AUTH_RATE_LIMIT_WINDOW_SECONDS" "300"
ensure_env_var "AUTH_RATE_LIMIT_MAX_ATTEMPTS" "5"
ensure_env_var "AUTH_RATE_LIMIT_BLOCK_SECONDS" "900"
ensure_env_var "AUTH_TRUST_PROXY_HEADERS" "false"

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
  prompt_env_var "AUTH_PASSWORD_MIN_LENGTH" "Mindestlaenge fuer Passwort" "$PASSWORD_MIN_LENGTH"

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

  echo ""
  echo "👤  Initialen Admin anlegen"
  printf "Admin-Benutzername [%s]: " "admin"
  read -r INPUT_ADMIN_USERNAME
  if [ -z "$INPUT_ADMIN_USERNAME" ]; then
    ADMIN_USERNAME="admin"
  else
    ADMIN_USERNAME="$INPUT_ADMIN_USERNAME"
  fi

  while true; do
    ADMIN_PASSWORD=$(prompt_secret "Admin-Passwort (mindestens ${PASSWORD_MIN_LENGTH} Zeichen)")
    if [ ${#ADMIN_PASSWORD} -lt "$PASSWORD_MIN_LENGTH" ]; then
      echo "Passwort ist zu kurz. Bitte mindestens ${PASSWORD_MIN_LENGTH} Zeichen verwenden."
      continue
    fi

    ADMIN_PASSWORD_CONFIRM=$(prompt_secret "Admin-Passwort wiederholen")
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
      echo "Passwörter stimmen nicht überein. Bitte erneut versuchen."
      continue
    fi

    break
  done
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
SEED_ADMIN_USERNAME="$ADMIN_USERNAME" SEED_ADMIN_PASSWORD="$ADMIN_PASSWORD" npx tsx scripts/seed.ts

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
