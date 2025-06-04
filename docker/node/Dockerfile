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
ARG VITE_SHOW_DEV_TOOLS

# Set environment variables for the build
ENV VITE_SHOW_DEV_TOOLS=${VITE_SHOW_DEV_TOOLS}

RUN pnpm run build
RUN pnpm prune --prod

FROM nginx:alpine AS production

# Copy nginx configuration
COPY docker/node/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build-prod stage
COPY --from=build-prod /app/frontend/build /usr/share/nginx/html

# Create a health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/healthcheck || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

CMD ["nginx", "-g", "daemon off;"]
