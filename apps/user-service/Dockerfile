FROM node:20-bullseye-slim AS base
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sonoria/schemas build \
 && pnpm --filter @sonoria/utils build
RUN pnpm --filter @sonoria/user-service run prisma:generate
RUN pnpm --filter @sonoria/user-service build

FROM node:20-bullseye-slim AS runner
ENV NODE_ENV=production
ENV PORT=3001
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/user-service/package.json ./apps/user-service/package.json
COPY --from=builder /app/apps/user-service/dist ./apps/user-service/dist
COPY --from=builder /app/apps/user-service/node_modules ./apps/user-service/node_modules
COPY --from=builder /app/apps/user-service/prisma ./apps/user-service/prisma
WORKDIR /app/apps/user-service
EXPOSE 3001
CMD ["node", "dist/main.js"]
