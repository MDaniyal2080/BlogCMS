# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

# Prisma on Alpine needs libc6-compat for native engines
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm install -g @nestjs/cli prisma && \
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

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3001

# Start application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
