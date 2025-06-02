from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from app.models import ClassificationStatus, SensorDataInput

router = APIRouter()

# In-memory storage for sensor readings
# Structure: {unit_id: [list of readings]}
SENSOR_READINGS_STORE: dict[str, list[dict[str, Any]]] = {}


def classify_reading(readings: dict[str, float]) -> str:
    """
    Classify sensor readings based on pH levels.

    We only use pH for classification because it's the most critical factor
    for plant health in hydroponics. Temperature and EC affect growth rates
    but pH directly impacts nutrient availability. The 5.5-7.0 range was chosen
    because outside this range, essential nutrients become chemically unavailable to plants regardless of their concentration in the solution.

    Args:
        readings: Dictionary containing sensor readings with keys 'pH', 'temp', and 'ec'.

    Returns:
        Classification string: either "Healthy" or "Needs Attention".
    """
    ph_value = readings["pH"]
    return "Needs Attention" if ph_value < 5.5 or ph_value > 7.0 else "Healthy"


@router.post(
    "/sensor",
    response_model=ClassificationStatus,
    status_code=status.HTTP_200_OK,
    summary="Submit sensor readings",
    description="Submit sensor readings from a hydroponic unit and receive health classification",
    responses={
        200: {
            "description": "Sensor data received and classified",
            "model": ClassificationStatus,
        },
        422: {
            "description": "Validation error in request body",
        },
    },
)
async def submit_sensor_reading(sensor_data: SensorDataInput) -> ClassificationStatus:
    """
    Submit sensor readings and receive classification.

    This endpoint provides immediate feedback to growers about their system's health. In hydroponic systems, pH can drift quickly, so real-time classification helps prevent crop damage. We accept all three readings (pH, temp, EC) even though we only classify on pH because:

    1. In real world we would use temp/EC for more sophisticated analysis
    2. Historical data collection needs all values for trend analysis
    3. Growers expect to submit complete sensor packages from their devices

    Args:
        sensor_data: Validated sensor input containing unitId, timestamp, and readings.

    Returns:
        ClassificationStatus with status="OK" and classification result.

    Raises:
        HTTPException: 422 for validation errors, 500 for unexpected errors.
    """
    try:
        readings_data = {
            "pH": sensor_data.readings.pH,
            "temp": sensor_data.readings.temp,
            "ec": sensor_data.readings.ec,
        }

        classification = classify_reading(readings_data)

        reading_entry = {
            "timestamp": sensor_data.timestamp,
            "readings": readings_data,
            "classification": classification,
        }  # Store reading in memory

        SENSOR_READINGS_STORE.setdefault(sensor_data.unit_id, []).append(reading_entry)

        return ClassificationStatus(status="OK", classification=classification)

    except ValidationError as exc:
        # In case our models change or FastAPI's behavior changes,
        # we want explicit handling
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    except Exception as exc:
        # Generic catch-all because sensor data is critical - we'd rather return
        # 500 error than silently fail and leave growers without feedback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the sensor data",
        ) from exc
