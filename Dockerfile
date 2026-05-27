FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY tsconfig.json wxt.config.ts wxt-env.d.ts ./
COPY src ./src
COPY public ./public
RUN bun install --frozen-lockfile

WORKDIR /app/demo
COPY demo/package.json demo/bun.lock ./
RUN bun install --frozen-lockfile

WORKDIR /app
COPY demo ./demo

WORKDIR /app/demo
ENV PUBLIC_HOSTED_DEMO=true
ENV PUBLIC_GA_MEASUREMENT_ID=G-8GKG8GB0GV
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/demo/dist /usr/share/nginx/html
