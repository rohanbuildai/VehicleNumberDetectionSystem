# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env args (baked into React bundle)
ARG REACT_APP_API_URL=/api/v1
ARG REACT_APP_SOCKET_URL

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
# Suppress CRA warnings that cause non-zero exit in strict CI
ENV CI=false
ENV GENERATE_SOURCEMAP=false

# Install deps first (cached layer - only re-runs if package.json changes)
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# ─── Production Stage (Nginx) ─────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy React build
COPY --from=builder /app/build /usr/share/nginx/html

# Copy SPA routing config
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
