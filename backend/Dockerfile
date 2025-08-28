# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and install ALL dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - smaller image
FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client in production image
RUN npx prisma generate

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["/usr/local/bin/docker-entrypoint.sh"]
