#!/bin/bash
set -e

echo "🚀 Starting BlogCMS Backend (Railway)..."

# Log environment
echo "📊 NODE_ENV: ${NODE_ENV:-production}"
echo "🔌 PORT: ${PORT:-3001}"
echo "💾 Database configured: $([ -n "$DATABASE_URL" ] && echo "✅" || echo "❌")"

# Try migrations but don't fail if they don't work
echo "🔄 Attempting database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations completed successfully"
else
    echo "⚠️  Migrations failed or not needed, continuing..."
fi

# Start the application
echo "🎯 Starting NestJS application..."
exec node dist/main.js
