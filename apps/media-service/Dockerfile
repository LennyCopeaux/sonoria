FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sonoria/schemas build \
 && pnpm --filter @sonoria/utils build \
 && pnpm --filter @sonoria/media-service build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3002
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/media-service/package.json ./apps/media-service/package.json
COPY --from=builder /app/apps/media-service/dist ./apps/media-service/dist
COPY --from=builder /app/apps/media-service/node_modules ./apps/media-service/node_modules
WORKDIR /app/apps/media-service
EXPOSE 3002
CMD ["node", "dist/main.js"]
