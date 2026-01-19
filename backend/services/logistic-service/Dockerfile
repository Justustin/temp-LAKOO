# ========================================
# LOGISTIC SERVICE DOCKERFILE
# ========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engine deps + basic tooling
RUN apk add --no-cache openssl

# Enable pnpm via corepack
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY scripts ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Build (includes prisma generate + copy generated prisma into dist/)
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl dumb-init wget
RUN corepack enable

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# Copy Prisma schema (optional but useful for introspection/migrations)
COPY --from=builder /app/prisma ./prisma

# Copy built application (includes dist/generated/prisma)
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (service default: 3009)
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3009/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

