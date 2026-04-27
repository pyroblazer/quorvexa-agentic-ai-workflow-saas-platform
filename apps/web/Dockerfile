FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.12.3
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
COPY apps/gateway/package.json apps/gateway/package.json
COPY services/auth-service/package.json services/auth-service/package.json
COPY services/user-service/package.json services/user-service/package.json
COPY services/workflow-service/package.json services/workflow-service/package.json
COPY services/notification-service/package.json services/notification-service/package.json
RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1 \
    DOCKER_BUILD=1
RUN pnpm turbo run build --filter=web

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
