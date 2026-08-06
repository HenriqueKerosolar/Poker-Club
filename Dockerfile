# Poker Club backend — build único e confiável
FROM node:20-slim

WORKDIR /app

# OpenSSL é necessário para o Prisma em imagens slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@8

# Arquivos do workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Instala apenas backend + shared (e suas dependências)
RUN pnpm install --frozen-lockfile --filter @poker-club/backend... --filter @poker-club/shared

WORKDIR /app/packages/backend

# Gera o Prisma Client e compila com SWC
RUN pnpm exec prisma generate
RUN pnpm build

ENV NODE_ENV=production

EXPOSE 3012

CMD ["node", "dist/main.js"]
