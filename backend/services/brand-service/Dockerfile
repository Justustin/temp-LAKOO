# ========================================
# BRAND SERVICE DOCKERFILE
# ========================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm and dependencies for Prisma
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm run db:generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src/
COPY scripts ./scripts/

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm and openssl for Prisma
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache openssl dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/generated ./src/generated

# Copy built application
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3015

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3015/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
