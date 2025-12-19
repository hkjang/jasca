FROM ubuntu:22.04 AS base

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    postgresql-14 \
    postgresql-contrib \
    redis-server \
    supervisor \
    openssl \
    locales \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Set Locale and Timezone
RUN locale-gen ko_KR.UTF-8
ENV LANG=ko_KR.UTF-8
ENV LC_ALL=ko_KR.UTF-8
ENV TZ=Asia/Seoul
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Setup directories
WORKDIR /app

# PROD DEPS STAGE
FROM base AS prod-deps
WORKDIR /app
COPY . .
# Force hoisting to ensure simple node_modules structure for copying
RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --frozen-lockfile
# Generate prisma client (requires dev deps)
RUN pnpm -r run prisma:generate
# Prune to production deps only (removes prisma CLI but keeps generated client)
RUN pnpm prune --prod

# BUILDER STAGE
FROM base AS builder
WORKDIR /app
COPY . .
# Standard install for build
RUN pnpm install --frozen-lockfile
# Generate prisma
RUN pnpm -r run prisma:generate
# Build API
RUN pnpm --filter api build
# Build Web
RUN pnpm --filter web build

# RUNNER STAGE
FROM base AS runner
WORKDIR /app

# Copy production node_modules from prod-deps
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy API artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Copy Web artifacts (Standalone)
# Next.js standalone folder puts files in a structure like .next/standalone/apps/web/server.js
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# apps/web/public does not exist, so skipping


# Copy Configs
COPY docker/monolith/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/monolith/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Configure Redis to bind to all interfaces
RUN sed -i "s/bind 127.0.0.1 -/bind 0.0.0.0/" /etc/redis/redis.conf || true
RUN sed -i "s/bind 127.0.0.1 ::1/bind 0.0.0.0/" /etc/redis/redis.conf || true

# Volumes for persistence
VOLUME ["/var/lib/postgresql/data", "/var/lib/redis"]

# Ports
EXPOSE 3000 3001

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
