# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and install ALL dependencies
COPY package*.json ./
RUN npm ci

# Copy and build
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Production stage - smaller image
FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client in production image
RUN npx prisma generate

# Copy entrypoint
COPY --from=builder /app/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
