# Use a Python image with uv pre-installed
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS uv

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

WORKDIR /app/backend

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
  --mount=type=bind,source=backend/uv.lock,target=uv.lock \
  --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
  uv sync --frozen --no-install-project --no-dev --no-editable

# Then, add the rest of the project source code and install it
# Installing separately from its dependencies allows optimal layer caching
COPY backend/ /app/backend/

RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --frozen --no-dev --no-editable

FROM python:3.13-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY --from=uv /app/backend/.venv /app/backend/.venv
COPY --from=uv /app/backend /app/backend

# Place executables in the environment at the front of the path
ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONPATH=/app

# Set default port
ENV PORT=8000

CMD ["sh", "-c", "fastapi run backend/app/main.py --host 0.0.0.0 --port $PORT"]
