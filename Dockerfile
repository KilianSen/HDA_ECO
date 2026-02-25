# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Setup the backend and serve frontend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=frontend-builder /app/dist ./dist
COPY server ./server
# Need ts-node or to compile server. For simplicity/speed in this setup, 
# we'll install ts-node in prod or pre-compile. 
# Better: compile server TS to JS.
# Let's install typescript and ts-node for production run or compile.
# To keep it standard, let's just run with ts-node for now or use a build step for server.
# Given the package.json, we don't have a server build script. 
# We'll install ts-node as a dependency or devDependency is fine if we copy node_modules? 
# No, better to install dependencies.
RUN npm install typescript ts-node

EXPOSE 3001
CMD ["npx", "ts-node", "server/index.ts"]
