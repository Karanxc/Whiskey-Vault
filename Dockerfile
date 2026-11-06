# Whiskey Vault - Production Container
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application files
COPY . .

# Ensure data and uploads directories exist with write permissions
RUN mkdir -p data public/uploads

# Expose server port
EXPOSE 3000

# Environment defaults
ENV PORT=3000 \
    NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start Whiskey Vault server
CMD ["npm", "start"]
