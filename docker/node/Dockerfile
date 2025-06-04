FROM node:24.1-slim AS base

# Set up pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Enable Corepack to manage package manager versions (e.g., pnpm)
# without explicit installation
RUN corepack enable
RUN corepack use pnpm@latest

WORKDIR /app/frontend

# Copy only files required to install dependencies
COPY frontend/package.json frontend/pnpm-lock.yaml /app/frontend/

FROM base AS dev

# Install dependencies using pnpm
RUN --mount=type=cache,target=/pnpm/store \
  --mount=type=bind,source=frontend/pnpm-lock.yaml,target=pnpm-lock.yaml \
  --mount=type=bind,source=frontend/package.json,target=package.json \
  pnpm install --frozen-lockfile

# Copy the project into the image
COPY frontend/ /app/frontend

CMD ["pnpm", "react-router", "dev", "--host", "0.0.0.0"]

FROM dev AS build-prod
# Build-time arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_SHOW_DEV_TOOLS

# Set environment variables for the build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SHOW_DEV_TOOLS=${VITE_SHOW_DEV_TOOLS}

RUN pnpm run build
RUN pnpm prune --prod

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

CMD ["pnpm", "start"]
