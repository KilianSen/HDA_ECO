# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies for better-sqlite3
# We need to build it for the alpine environment
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production \
    && apk del python3 make g++

# Copy built frontend and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server/server ./server

# Create data and uploads directories and ensure correct permissions
RUN mkdir -p data uploads && chmod 777 data uploads

EXPOSE 3001
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/settings || exit 1

CMD ["node", "server/index.js"]
