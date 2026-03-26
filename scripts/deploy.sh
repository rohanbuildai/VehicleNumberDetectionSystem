#!/bin/bash
# ============================================
# PlateDetect AI - Deployment Script
# ============================================
set -e

MODE=${1:-prod}   # prod | dev
echo ""
echo "🚀 PlateDetect AI — Deploy ($MODE)"
echo "======================================"

# Check required tools
for cmd in docker openssl; do
  command -v "$cmd" &>/dev/null || { echo "❌ $cmd is required but not installed"; exit 1; }
done

# Check docker compose (v2 plugin or v1 standalone)
if docker compose version &>/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  echo "❌ docker compose or docker-compose required"; exit 1
fi
echo "✅ Using: $DC"

if [ "$MODE" = "dev" ]; then
  echo "▶️  Starting DEV stack (no Nginx, ports exposed directly)..."
  $DC -f docker-compose.dev.yml up --build -d
  echo ""
  echo "🎉 Dev stack running!"
  echo "   Frontend:  http://localhost:3000"
  echo "   Backend:   http://localhost:5000"
  echo "   API:       http://localhost:5000/api/v1"
  echo "   Mongo:     localhost:27017"
  echo "   Redis:     localhost:6379"
  exit 0
fi

# ── Production deploy ──────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "📝 Creating .env from template..."
  cp .env.example .env

  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n/+=' | head -c 80)
  REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n/+=' | head -c 80)
  MONGO_PASS=$(openssl rand -hex 16)
  REDIS_PASS=$(openssl rand -hex 16)

  # Use perl for reliable cross-platform in-place substitution
  perl -i -pe "s|change_me_min_64_char_random_string_here_xxxxxxxxxxxxxxxxxxxxxxxx|${JWT_SECRET}|" .env
  perl -i -pe "s|change_me_different_64_char_random_string_here_xxxxxxxxxxxxxxxxx|${REFRESH_SECRET}|" .env
  perl -i -pe "s|change_me_strong_password_here|${MONGO_PASS}|" .env
  perl -i -pe "s|change_me_redis_password_here|${REDIS_PASS}|" .env

  echo "✅ Secrets auto-generated in .env"
  echo "⚠️  Edit .env to add SMTP credentials for email features"
fi

echo ""
echo "🐳 Building Docker images..."
$DC build --no-cache

echo ""
echo "▶️  Starting production services..."
$DC up -d

echo ""
echo "⏳ Waiting for backend health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend healthy (${i}s)"
    break
  fi
  [ $i -eq 30 ] && { echo "❌ Backend failed to start"; $DC logs backend | tail -30; exit 1; }
  sleep 2
done

echo ""
echo "✅ PlateDetect AI is running!"
echo ""
echo "   🌐 App:      http://localhost  (via Nginx)"
echo "   ⚛️  Frontend: http://localhost:3000"
echo "   🔌 API:      http://localhost:5000/api/v1"
echo "   ❤️  Health:   http://localhost:5000/health"
echo ""
echo "📋 Useful commands:"
echo "   Logs:        $DC logs -f"
echo "   Backend log: $DC logs -f backend"
echo "   Stop:        $DC down"
echo "   Restart:     $DC restart backend"
echo "   DB shell:    docker exec -it platedetect_mongo mongosh"
