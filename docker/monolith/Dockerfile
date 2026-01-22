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
# Compile seed.ts to JavaScript for offline execution (using project tsconfig)
RUN cd apps/api && npx tsc prisma/seed.ts --outDir prisma --skipLibCheck

# RUNNER STAGE
FROM base AS runner
WORKDIR /app

# Install Trivy (Offline capability preparation)
RUN apt-get update && apt-get install -y wget lsb-release \
    && wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | tee /usr/share/keyrings/trivy.gpg > /dev/null \
    && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee -a /etc/apt/sources.list.d/trivy.list \
    && apt-get update && apt-get install -y trivy \
    && rm -rf /var/lib/apt/lists/*

# Copy Trivy DB for offline usage (optional - create empty dir if not present)
# For offline usage, mount the trivy-db at runtime: -v /path/to/trivy-db:/app/trivy-db
RUN mkdir -p /app/trivy-db
COPY trivy-d[b] /app/trivy-db/
ENV TRIVY_CACHE_DIR=/app/trivy-db

# Copy Web artifacts (Standalone) FIRST to avoid node_modules conflicts
# Next.js standalone build output: server.js is at the root of the standalone folder
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

# Preserve standalone's node_modules (contains 'next' and required deps)
RUN mv node_modules node_modules_web

# Copy production node_modules from prod-deps (for API)
COPY --from=prod-deps /app/node_modules ./node_modules

# Merge web's node_modules into main node_modules (copy missing modules)
RUN cp -rn node_modules_web/* node_modules/ 2>/dev/null || true && \
    rm -rf node_modules_web && \
    echo "=== Verifying next module ===" && \
    ls -la node_modules/next && \
    echo "next module found"

# Ensure server.js is accessible and create fallback symlink for compatibility
RUN echo "=== Verifying server.js location ===" && \
    ls -la server.js && \
    echo "server.js found at /app/server.js" && \
    mkdir -p apps/web && \
    ln -sf /app/server.js /app/apps/web/server.js && \
    echo "Created symlink: /app/apps/web/server.js -> /app/server.js"

# Copy API artifacts
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Copy compiled seed.js
COPY --from=builder /app/apps/api/prisma/seed.js ./apps/api/prisma/seed.js


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
