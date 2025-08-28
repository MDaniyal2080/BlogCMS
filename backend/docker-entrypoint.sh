#!/bin/sh
set -e

echo "Starting application..."

# Wait for database to be available (with timeout)
wait_for_db() {
    echo "Waiting for database to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            echo "Database is ready!"
            return 0
        fi
        
        echo "Database not ready yet (attempt $attempt/$max_attempts), waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "Warning: Database may not be ready after $max_attempts attempts, continuing anyway..."
    return 1
}

# Try to wait for database, but don't fail if it's not ready
wait_for_db || true

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy || {
    echo "Migration failed, but continuing startup..."
    echo "This may be expected if database is still initializing..."
}

# Generate Prisma client (in case it's missing)
echo "Ensuring Prisma client is generated..."
npx prisma generate || {
    echo "Prisma generate failed, but continuing..."
}

# Start the application
echo "Starting NestJS server..."
echo "Server will be available at http://0.0.0.0:${PORT:-3001}/api"
exec node dist/main.js
