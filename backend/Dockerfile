# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Skip app-level postinstall (we'll generate explicitly)
ENV PRISMA_SKIP_POSTINSTALL=1

# Copy package files and Prisma schema before install to allow postinstall to generate
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
  
# Generate Prisma client explicitly (ensures types for build)
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Production stage - smaller image
FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Skip app-level postinstall (we'll generate explicitly)
ENV PRISMA_SKIP_POSTINSTALL=1

# Copy package files and Prisma schema before install to allow postinstall to generate
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npm cache clean --force
  
# Generate Prisma client in the production image (ensures correct binaries)
RUN npx prisma generate
  
# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

# Always run our entrypoint (handles migrations) and then start the app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
