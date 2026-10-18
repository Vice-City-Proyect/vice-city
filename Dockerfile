# ==============================================================================
# Dockerfile - Vice City Project (Next.js 16 + Prisma 6 + Node.js 22 LTS)
# Multi-stage build optimizado para producción con Next.js standalone output
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Dependencias (deps)
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Archivos de bloqueo y configuración de paquetes
COPY package.json package-lock.json ./

# Script obligatorio por política de dependencias congeladas ("preinstall")
COPY scripts/verify-npm-ci.mjs ./scripts/verify-npm-ci.mjs

# Esquema de Prisma necesario para "postinstall" (prisma generate)
COPY prisma ./prisma

# Instalación reproducible estricta mediante npm ci
RUN npm ci

# ------------------------------------------------------------------------------
# 2. Compilación (builder)
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para compilación Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generación explícita del cliente Prisma antes de compilar Next.js
RUN npx prisma generate

# Compilación de la aplicación Next.js (genera .next/standalone)
RUN npm run build

# ------------------------------------------------------------------------------
# 3. Imagen Final de Ejecución (runner)
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Crear usuario y grupo sin privilegios de root (seguridad)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Copiar archivos públicos estáticos
COPY --from=builder /app/public ./public

# Crear directorio de caché de Next.js con permisos correctos
RUN mkdir .next && chown nextjs:nodejs .next

# Copiar el artefacto standalone generado por Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Garantizar recursos y esquemas de Prisma para el runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

