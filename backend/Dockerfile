FROM node:20-alpine

# Install dependencies for Prisma
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create uploads directory
RUN mkdir -p /app/uploads

# Copy and make entrypoint executable
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Start application
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
