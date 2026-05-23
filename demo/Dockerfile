FROM oven/bun:1 AS builder

WORKDIR /app/demo

COPY demo/package.json demo/bun.lock ./
RUN bun install --frozen-lockfile

COPY demo /app/demo
COPY src /app/src
RUN bun run build

FROM nginx:1.27-alpine

COPY --from=builder /app/demo/dist /usr/share/nginx/html
