# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Prisma on Alpine needs libc6-compat for native engines
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (dev + prod) for build
RUN npm ci && \
    npx prisma generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

# Prisma on Alpine needs libc6-compat for native engines
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema and generate client
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3001

# Start application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
