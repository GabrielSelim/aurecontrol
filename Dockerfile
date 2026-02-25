# ============================================================
# AureControl Frontend - Multi-stage build
# ============================================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Aceita variáveis de ambiente em build time
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:1.27-alpine

# Copia o build para o nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Config padrão (pode ser sobrescrita via volume)
COPY docker/volumes/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
