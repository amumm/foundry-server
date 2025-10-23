# Production stage
FROM node:20-slim

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for running the application
RUN groupadd -r foundryvtt && useradd -r -g foundryvtt foundryvtt

# Copy package files first
COPY package*.json ./

# Copy all node_modules from local (includes all dependencies + private packages)
COPY node_modules ./node_modules

# Rebuild ALL packages to ensure native bindings work on Linux
# Use --build-from-source to force recompilation of native modules
RUN npm rebuild --build-from-source

# Copy application files
COPY --chown=foundryvtt:foundryvtt main.js main.mjs ./
COPY --chown=foundryvtt:foundryvtt client ./client
COPY --chown=foundryvtt:foundryvtt common ./common
COPY --chown=foundryvtt:foundryvtt dist ./dist
COPY --chown=foundryvtt:foundryvtt public ./public
COPY --chown=foundryvtt:foundryvtt templates ./templates
COPY --chown=foundryvtt:foundryvtt license.html ./

# Create data directory for persistent storage
RUN mkdir -p /data && chown -R foundryvtt:foundryvtt /data

# Fix ownership of app directory
RUN chown -R foundryvtt:foundryvtt /app

# Switch to non-root user
USER foundryvtt

# Expose the default port
EXPOSE 30000

# Set environment variables
ENV NODE_ENV=production \
    FOUNDRY_DATA_PATH=/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:30000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => { process.exit(1); });"

# Start the application with data path
CMD ["node", "main.js", "--dataPath=/data"]

