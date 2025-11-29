# ---------------------------
# PRODUCTION DOCKERFILE
# ---------------------------

FROM node:24-slim AS base

# Install FFmpeg for pipeline
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files
COPY package.json pnpm-lock.yaml ./
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --prod=false

# Build the TypeScript project
RUN pnpm build

# Remove dev dependencies for production image
RUN pnpm prune --prod

EXPOSE 3000

CMD ["node", "dist/index.js"]
