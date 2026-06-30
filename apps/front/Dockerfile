FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are inlined at build time, so they must be set before `next build`.
ARG NEXT_PUBLIC_API_URL=http://localhost:3010
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sonoria/schemas build \
 && pnpm --filter @sonoria/utils build \
 && pnpm --filter @sonoria/front build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3004
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/front/package.json ./apps/front/package.json
COPY --from=builder /app/apps/front/.next ./apps/front/.next
COPY --from=builder /app/apps/front/public ./apps/front/public
COPY --from=builder /app/apps/front/next.config.ts ./apps/front/next.config.ts
COPY --from=builder /app/apps/front/node_modules ./apps/front/node_modules
WORKDIR /app/apps/front
EXPOSE 3004
CMD ["pnpm", "start"]
