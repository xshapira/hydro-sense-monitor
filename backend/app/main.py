from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import config


@asynccontextmanager
async def lifespan(_application: FastAPI) -> AsyncGenerator:
    # Startup
    yield
    # Shutdown


def get_application() -> FastAPI:
    application = FastAPI(
        title=config.PROJECT_NAME,
        openapi_url=f"{config.API_V1_STR}/openapi.json",
        description="API for monitoring hydroponic sensor readings and alerts",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Set all CORS enabled origins
    if config.all_cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=config.all_cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    application.include_router(api_router, prefix=config.API_V1_STR)
    return application


app = get_application()


@app.get("/healthcheck", include_in_schema=False)
async def health_check() -> dict[str, str]:
    return {
        "status": "Server is running!",
    }
