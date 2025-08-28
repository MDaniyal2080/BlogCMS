#!/bin/sh
set -e

echo "🚀 Starting BlogCMS Backend..."

# Log environment info
echo "📊 Environment: ${NODE_ENV:-development}"
echo "🔌 Port: ${PORT:-3001}"
echo "💾 Database URL configured: $([ -n "$DATABASE_URL" ] && echo "Yes" || echo "No")"

# Run Prisma migrations (non-blocking)
echo "🔄 Running database migrations..."
npx prisma migrate deploy || {
    echo "⚠️  Migration failed, continuing startup..."
}

# Start the application
echo "🎯 Starting NestJS server..."
exec node dist/main.js
