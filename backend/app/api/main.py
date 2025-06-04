from backend.app.api.routes import sensor
from fastapi import APIRouter

api_router = APIRouter()

api_router.include_router(sensor.router, prefix="", tags=["sensor"])
