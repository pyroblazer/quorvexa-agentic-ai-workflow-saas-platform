FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY services/workflow-service/ services/workflow-service/
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=workflow-service

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app
COPY --from=builder /app/services/workflow-service/dist ./dist
COPY --from=builder /app/services/workflow-service/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 3003
CMD ["node", "dist/main.js"]
