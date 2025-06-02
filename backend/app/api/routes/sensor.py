from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from app.schemas import (
    AlertsResponse,
    ClassificationStatus,
    SensorDataInput,
    SensorDataRecord,
)

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


@router.get(
    "/alerts",
    response_model=AlertsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get alerts for a specific unit",
    description="Retrieve the last 10 sensor readings classified as 'Needs Attention' for a specific unit",
    responses={
        200: {
            "description": "Alerts retrieved successfully",
            "model": AlertsResponse,
        },
        400: {
            "description": "Invalid unitId parameter",
        },
        404: {
            "description": "No alerts found for the specified unit",
        },
    },
)
async def get_unit_alerts(unit_id: str | None = None) -> AlertsResponse:
    """
    Get alerts for a specific hydroponic unit.

    This endpoint provides critical information for growers by showing recent
    problematic readings. In hydroponics, pH drift outside the 5.5-7.0 range
    can quickly damage crops by making nutrients unavailable. By returning the
    last 10 alerts, growers can:

    1. Identify recurring issues (e.g., consistent pH drift at night)
    2. Track how quickly problems develop
    3. Verify if corrective actions worked

    Args:
        unit_id: Query parameter for the unit to retrieve alerts for.

    Returns:
        AlertsResponse containing the unit_id and list of alert readings.

    Raises:
        HTTPException: 400 if unitId is missing/invalid, 404 if no alerts found.
    """
    if not unit_id or not unit_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="unitId query parameter is required and cannot be empty",
        )

    unit_id = unit_id.strip()

    unit_readings = SENSOR_READINGS_STORE.get(unit_id, [])

    alerts = [
        SensorDataRecord(
            unitId=unit_id,
            timestamp=reading["timestamp"],
            readings=reading["readings"],
            classification=reading["classification"],
        )
        for reading in unit_readings
        if reading["classification"] == "Needs Attention"
    ]

    # Most recent alerts are most actionable - growers need to know
    # what's happening NOW
    alerts.sort(key=lambda x: x.timestamp, reverse=True)

    # Why 10? Hydroponic systems typically cycle nutrients every 2-3 hours.
    # Ten alerts give growers ~20-30 hours of problem history - enough to spot # patterns without overwhelming them.
    alerts = alerts[:10]

    # Always return 200 OK even for non-existent units or empty results.
    # A 404 would imply something is wrong, but having no alerts means the
    # system is healthy.
    return AlertsResponse(unitId=unit_id, alerts=alerts)
