# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy private @foundryvtt packages that aren't available on npm (must be before npm install)
COPY node_modules/@foundryvtt ./node_modules/@foundryvtt

# Copy package files and install public dependencies
# Using npm install instead of npm ci because @foundryvtt/pdfjs is private
COPY package.json package-lock.json ./
RUN npm install --production --no-audit

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 foundry

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY --chown=foundry:nodejs package.json package-lock.json ./
COPY --chown=foundry:nodejs main.js main.mjs ./
COPY --chown=foundry:nodejs license.html ./
COPY --chown=foundry:nodejs client ./client
COPY --chown=foundry:nodejs common ./common
COPY --chown=foundry:nodejs dist ./dist
COPY --chown=foundry:nodejs public ./public
COPY --chown=foundry:nodejs templates ./templates

# Create directories for Foundry data
RUN mkdir -p /app/data /app/packages /app/logs && \
    chown -R foundry:nodejs /app/data /app/packages /app/logs

USER foundry

# Foundry VTT typically runs on port 30000
EXPOSE 30000

ENV PORT=30000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "main.js"]

