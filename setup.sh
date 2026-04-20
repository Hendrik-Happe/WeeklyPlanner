#!/bin/bash
set -e

echo ""
echo "🚀  WeeklyPlaner – Setup wird gestartet..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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
