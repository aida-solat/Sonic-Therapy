# Multi-stage Dockerfile for Ambient Background Music Generator API
# Build stage: install deps and compile TypeScript
FROM node:24-slim AS base

# Enable corepack so pnpm is available
RUN corepack enable

WORKDIR /app
ENV NODE_ENV=production

# Install ffmpeg (required by the API)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM deps AS build

COPY . .
RUN pnpm build

# Runtime stage
FROM base AS runner

WORKDIR /app

# Copy production node_modules and built assets
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Fastify listens on PORT (default 3000)
EXPOSE 3000

CMD ["node", "dist/index.js"]
