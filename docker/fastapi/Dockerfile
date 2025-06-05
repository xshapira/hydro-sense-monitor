FROM python:3.13-slim-bookworm

WORKDIR /app/backend

# Install uv
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#installing-uv
COPY --from=ghcr.io/astral-sh/uv:0.7.11 /uv /uvx /bin/

ENV PATH="/app/backend/.venv/bin:$PATH"

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
  --mount=type=bind,source=backend/uv.lock,target=uv.lock \
  --mount=type=bind,source=backend/pyproject.toml,target=pyproject.toml \
  uv sync --frozen --no-install-project --no-dev --no-editable

ENV PYTHONPATH=/app/backend

COPY backend/pyproject.toml backend/uv.lock /app/backend/

COPY backend/app /app/backend/app

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0"]
