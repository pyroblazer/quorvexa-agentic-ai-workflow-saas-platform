FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY apps/gateway/ apps/gateway/
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=gateway

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
COPY --from=builder /app/apps/gateway/dist ./dist
COPY --from=builder /app/apps/gateway/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 4000
CMD ["node", "dist/main.js"]
