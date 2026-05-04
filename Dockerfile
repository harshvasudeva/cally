FROM oven/bun:1.3.11-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY client/package.json ./client/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN bun install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY client ./client
COPY packages ./packages
RUN bun --cwd client build

FROM oven/bun:1.3.11-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/client/.next ./client/.next
COPY --from=builder /app/client/public ./client/public
COPY package.json bun.lock ./
COPY client/package.json ./client/package.json
COPY client/next.config.ts ./client/next.config.ts

EXPOSE 3000
CMD ["bun", "--cwd", "client", "start"]

