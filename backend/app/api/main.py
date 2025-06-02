from fastapi import APIRouter

from app.api.routes import sensor

api_router = APIRouter()

api_router.include_router(sensor.router, prefix="", tags=["sensor"])
