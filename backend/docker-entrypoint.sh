#!/bin/sh
set -e

echo "🚀 Starting BlogCMS Backend..."

# Log environment info
echo "📊 Environment: ${NODE_ENV:-development}"
echo "🔌 Port: ${PORT:-3001}"
echo "💾 Database URL configured: $([ -n "$DATABASE_URL" ] && echo "Yes" || echo "No")"

# Ensure unpooled URL for migrations if not set
if [ -z "$DATABASE_URL_UNPOOLED" ] && [ -n "$DATABASE_URL" ]; then
  export DATABASE_URL_UNPOOLED="$DATABASE_URL"
fi

# Run Prisma migrations in the background (non-blocking)
echo "🔄 Running database migrations in background..."
(
  npx prisma migrate deploy && echo "✅ Migrations completed" \
  || echo "⚠️  Migration failed (will not block startup)"
) &

# Start the application
echo "🎯 Starting NestJS server..."
exec node dist/main.js
