# Dockerfile
FROM oven/bun:slim

WORKDIR /app

COPY . .

RUN bun install

CMD ["bun", "index.ts"]
