FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sonoria/user-service prisma:generate
RUN pnpm --filter @sonoria/schemas build \
 && pnpm --filter @sonoria/utils build \
 && pnpm --filter @sonoria/social-service build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3005
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/social-service/package.json ./apps/social-service/package.json
COPY --from=builder /app/apps/social-service/dist ./apps/social-service/dist
COPY --from=builder /app/apps/social-service/node_modules ./apps/social-service/node_modules
WORKDIR /app/apps/social-service
EXPOSE 3005
CMD ["node", "dist/main.js"]
