from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, status

from app.exceptions import InvalidSensorReadingsError, InvalidTimestampError
from app.schemas import (
    AlertsResponse,
    ClassificationStatus,
    SensorDataInput,
    SensorDataRecord,
    UnitsResponse,
    UnitStatus,
)

router = APIRouter()

# In-memory storage for sensor readings
# Structure: {unit_id: [list of SensorDataRecord]}
SENSOR_READINGS_STORE: dict[str, list[SensorDataRecord]] = {}


def validate_timestamp(timestamp: datetime) -> None:
    """
    Validate timestamp is not in the future.

    Future timestamps indicate clock sync issues on sensor devices
    and can corrupt trend analysis by appearing out of sequence.

    Args:
        timestamp: The datetime to validate.

    Raises:
        InvalidTimestampError: When timestamp is in the future.
    """
    israel_tz = ZoneInfo("Asia/Jerusalem")
    now = datetime.now(israel_tz)
    if timestamp > now:
        raise InvalidTimestampError(
            timestamp.isoformat(),
            f"Timestamp cannot be in the future (current time in Israel: {now.isoformat()})",
        )


def validate_sensor_readings(readings: dict[str, float]) -> None:
    """
    Validate sensor readings are within physical limits.

    Catches malfunctioning sensors reporting impossible values before they
    corrupt our data analysis and classification.

    Args:
        readings: Dictionary containing sensor readings with keys 'pH', 'temp', and 'ec'.

    Raises:
        InvalidSensorReadingsError: When any reading is outside physical limits.
    """
    ph_value = readings["pH"]
    temp_value = readings["temp"]
    ec_value = readings["ec"]

    if not (0 <= ph_value <= 14):
        raise InvalidSensorReadingsError(
            f"pH value {ph_value} is outside valid range (0-14)"
        )

    if not (-10 <= temp_value <= 60):
        raise InvalidSensorReadingsError(
            f"Temperature {temp_value}°C is outside valid range (-10 to 60°C)"
        )

    if ec_value < 0:
        raise InvalidSensorReadingsError(f"EC value {ec_value} cannot be negative")


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
        400: {
            "description": "Invalid timestamp (e.g., future date)",
        },
        422: {
            "description": "Invalid sensor readings (e.g., pH outside 0-14 range, negative EC, extreme temperatures)",
        },
        500: {
            "description": "Unexpected server error",
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
        InvalidTimestampError: 400 for future timestamps indicating clock sync issues.
        InvalidSensorReadingsError: 422 for sensor readings outside physical limits.
        HTTPException: 500 for unexpected errors.
    """
    try:
        validate_timestamp(sensor_data.timestamp)

        readings_data = {
            "pH": sensor_data.readings.pH,
            "temp": sensor_data.readings.temp,
            "ec": sensor_data.readings.ec,
        }

        validate_sensor_readings(readings_data)
        classification = classify_reading(readings_data)

        reading_entry = SensorDataRecord(
            unitId=sensor_data.unit_id,
            timestamp=sensor_data.timestamp,
            readings=sensor_data.readings,
            classification=classification,
        )  # Store reading in memory

        SENSOR_READINGS_STORE.setdefault(sensor_data.unit_id, []).append(reading_entry)

        return ClassificationStatus(status="OK", classification=classification)

    except InvalidTimestampError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except InvalidSensorReadingsError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
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
async def get_unit_alerts(
    unit_id: str | None = Query(None, alias="unitId"),
) -> AlertsResponse:
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
    unit_exists = len(unit_readings) > 0

    alerts = [
        reading
        for reading in unit_readings
        if reading.classification == "Needs Attention"
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
    return AlertsResponse(
        unitId=unit_id,
        alerts=alerts,
        unitExists=unit_exists,
        totalReadings=len(unit_readings),
    )


@router.get(
    "/units",
    response_model=UnitsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all units with their health status",
    description="Retrieve all hydroponic units with their latest readings and health status",
    responses={
        200: {
            "description": "Units retrieved successfully",
            "model": UnitsResponse,
        },
    },
)
async def get_all_units() -> UnitsResponse:
    """
    Get overview of all hydroponic units with their health status.

    We're showing all units in the system with their current health status. Health status is determined by:

    - 'healthy': No alerts in the last 10 readings
    - 'warning': 1-3 alerts in the last 10 readings
    - 'critical': 4+ alerts in the last 10 readings

    This helps growers quickly identify which units need immediate attention
    without checking each unit individually.

    Returns:
        UnitsResponse containing all units with their status information.
    """
    unit_statuses = []

    for unit_id, readings in SENSOR_READINGS_STORE.items():
        sorted_readings = sorted(
            readings, key=lambda x: x.timestamp, reverse=True
        )  # newest first

        last_reading = sorted_readings[0] if sorted_readings else None

        alerts_count = sum(
            reading.classification == "Needs Attention" for reading in readings
        )  # total alerts

        recent_readings = sorted_readings[:10]
        recent_alerts = sum(
            reading.classification == "Needs Attention" for reading in recent_readings
        )  # health status based on alerts in last 10 readings

        if recent_alerts == 0:
            health_status = "healthy"
        elif recent_alerts <= 3:
            health_status = "warning"
        else:
            health_status = "critical"

        unit_status = UnitStatus(
            unitId=unit_id,
            lastReading=last_reading,
            totalReadings=len(readings),
            alertsCount=alerts_count,
            healthStatus=health_status,
        )
        unit_statuses.append(unit_status)

    status_order = {"critical": 0, "warning": 1, "healthy": 2}
    unit_statuses.sort(key=lambda x: (status_order[x.health_status], x.unit_id))

    return UnitsResponse(units=unit_statuses, totalUnits=len(unit_statuses))
