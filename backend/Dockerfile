# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/uploads ./uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
