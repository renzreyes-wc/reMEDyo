# NestJS API.
#
# Multi-stage so the runtime image carries the build output and production
# dependencies only, not the toolchain that produced them.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependencies -----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# --ignore-scripts skips the shared package's prepare build, which needs
# sources that are not copied yet; the build stage runs it explicitly.
RUN pnpm install --frozen-lockfile --ignore-scripts

# --- Build ------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm --filter @remedyo/shared build \
 && pnpm --filter @remedyo/api exec prisma generate \
 && pnpm --filter @remedyo/api build

# --- Runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api
EXPOSE 4000

# Migrate, then seed, then serve. The seed is idempotent, so a restart against
# an existing volume changes nothing.
#
# The binaries are invoked directly rather than through `pnpm exec`: pnpm would
# re-run the workspace lifecycle scripts, and the shared package's `prepare`
# (a tsc build) has no sources in this image — only its compiled dist.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/tsx prisma/seed.ts && node dist/main.js"]
