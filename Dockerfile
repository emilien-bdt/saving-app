# syntax=docker/dockerfile:1
# Production image (self-hosted server). Built by docker-compose.prod.yml:
#   target "builder" → runs `prisma migrate deploy` (service save-migrate)
#   target "runner"  → Next.js standalone server (service save-app)

FROM node:22-alpine AS deps
WORKDIR /app
# Dummy URL: prisma.config.ts reads it; nothing connects at build time.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate`
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
