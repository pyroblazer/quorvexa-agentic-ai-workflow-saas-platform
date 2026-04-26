# Multi-stage build — keeps the final image lean and secure
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm@9.12.3

# ── dependency stage ──────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml package.json ./
COPY packages/observability/package.json ./packages/observability/
COPY packages/config/package.json ./packages/config/
COPY services/auth-service/package.json ./services/auth-service/
RUN pnpm install --frozen-lockfile

# ── build stage ───────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY packages ./packages
COPY services/auth-service ./services/auth-service
COPY turbo.json ./
RUN pnpm --filter auth-service run build

# ── production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
USER nestjs

ENV NODE_ENV=production

COPY --from=builder --chown=nestjs:nodejs /app/services/auth-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health/live || exit 1

CMD ["node", "dist/main.js"]
