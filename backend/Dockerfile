# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Native build deps for Sharp (image processing)
RUN apk add --no-cache python3 make g++ vips-dev

# Install deps (cached layer)
COPY package.json ./
RUN npm install --only=production --legacy-peer-deps

# Copy source
COPY . .

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Sharp runtime dependency
RUN apk add --no-cache vips

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy from builder
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Create upload + log dirs with correct ownership
RUN mkdir -p uploads/original uploads/processed uploads/plates logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
