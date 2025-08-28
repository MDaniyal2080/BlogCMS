#!/bin/sh
set -e

echo "Starting application..."

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy || {
    echo "Migration failed, but continuing startup..."
}

# Start the application
echo "Starting NestJS server..."
exec node dist/main.js
