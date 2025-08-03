FROM node:24.1-slim AS base

# Install bun
COPY --from=oven/bun:1.2-debian /usr/local/bin/bun /bin/

WORKDIR /app/frontend

# Copy only files required to install dependencies
COPY frontend/package.json frontend/bun.lock /app/frontend/

FROM base AS dev

# Install dependencies using bun
RUN --mount=type=cache,target=/root/.bun/cache \
  --mount=type=bind,source=frontend/bun.lock,target=bun.lock \
  --mount=type=bind,source=frontend/package.json,target=package.json \
  bun install --frozen-lockfile

# Copy the project into the image
COPY frontend/ /app/frontend

CMD ["bun", "react-router", "dev", "--host", "0.0.0.0"]

FROM dev AS build-prod
# Build-time arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_SHOW_DEV_TOOLS

# Set environment variables for the build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SHOW_DEV_TOOLS=${VITE_SHOW_DEV_TOOLS}

RUN bun run build

# Bun doesn't have prune, so reinstall with --production
RUN rm -rf node_modules && bun install --frozen-lockfile --production

FROM base AS production

USER root

RUN mkdir -p /app/frontend && chown -R node:node /app/frontend

# Use non-root user
USER node

# Copy built application from build-prod stage
COPY --chown=node:node --from=build-prod /app/frontend/node_modules /app/frontend/node_modules
COPY --chown=node:node --from=build-prod /app/frontend/package.json /app/frontend/package.json
COPY --chown=node:node --from=build-prod /app/frontend/build /app/frontend/build

WORKDIR /app/frontend

CMD ["bun", "start"]
