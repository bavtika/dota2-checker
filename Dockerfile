# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HEALTH_PORT=8080

RUN addgroup -S app && adduser -S app -G app \
  && apk add --no-cache wget

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY app.js ./
COPY src ./src

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "app.js"]
