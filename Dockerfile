# Stage 1: Dependencies and Build
FROM node:20-slim as builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy backend package
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build backend
WORKDIR /app/packages/backend
RUN pnpm build

# Stage 2: Runtime
FROM node:20-slim

WORKDIR /app

# Install pnpm for running
RUN npm install -g pnpm@8

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only backend
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod && pnpm prune --prod

# Copy built dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3012

WORKDIR /app/packages/backend

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3012/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Expose port
EXPOSE 3012

# Run backend
CMD ["node", "dist/main.js"]
