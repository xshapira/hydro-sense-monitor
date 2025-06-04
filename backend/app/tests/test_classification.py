from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from backend.app.api.routes.sensor import (
    classify_reading,
    validate_sensor_readings,
    validate_timestamp,
)
from backend.app.exceptions import InvalidSensorReadingsError, InvalidTimestampError


def test_classify_reading_healthy():
    """
    Returns 'Healthy' for pH within 5.5-7.0 range.
    """
    assert classify_reading({"pH": 5.5, "temp": 22, "ec": 1.2}) == "Healthy"
    assert classify_reading({"pH": 6.0, "temp": 22, "ec": 1.2}) == "Healthy"
    assert classify_reading({"pH": 6.5, "temp": 22, "ec": 1.2}) == "Healthy"
    assert classify_reading({"pH": 7.0, "temp": 22, "ec": 1.2}) == "Healthy"


def test_classify_reading_needs_attention():
    """
    Returns 'Needs Attention' for pH outside 5.5-7.0 range.
    """
    assert classify_reading({"pH": 5.4, "temp": 22, "ec": 1.2}) == "Needs Attention"
    assert classify_reading({"pH": 4.0, "temp": 22, "ec": 1.2}) == "Needs Attention"
    assert classify_reading({"pH": 0.0, "temp": 22, "ec": 1.2}) == "Needs Attention"
    assert classify_reading({"pH": 7.1, "temp": 22, "ec": 1.2}) == "Needs Attention"
    assert classify_reading({"pH": 8.5, "temp": 22, "ec": 1.2}) == "Needs Attention"
    assert classify_reading({"pH": 14.0, "temp": 22, "ec": 1.2}) == "Needs Attention"


def test_validate_sensor_readings_valid():
    # Should not raise any exceptions
    validate_sensor_readings({"pH": 6.5, "temp": 22, "ec": 1.2})
    validate_sensor_readings({"pH": 0, "temp": -10, "ec": 0})
    validate_sensor_readings({"pH": 14, "temp": 60, "ec": 5})


def test_validate_sensor_readings_invalid_ph():
    with pytest.raises(InvalidSensorReadingsError) as exc_info:
        validate_sensor_readings({"pH": -0.1, "temp": 22, "ec": 1.2})
    assert "pH value -0.1 is outside valid range (0-14)" in str(exc_info.value)

    with pytest.raises(InvalidSensorReadingsError) as exc_info:
        validate_sensor_readings({"pH": 14.1, "temp": 22, "ec": 1.2})
    assert "pH value 14.1 is outside valid range (0-14)" in str(exc_info.value)


def test_validate_sensor_readings_invalid_temperature():
    with pytest.raises(InvalidSensorReadingsError) as exc_info:
        validate_sensor_readings({"pH": 6.5, "temp": -11, "ec": 1.2})
    assert "Temperature -11°C is outside valid range (-10 to 60°C)" in str(
        exc_info.value
    )

    with pytest.raises(InvalidSensorReadingsError) as exc_info:
        validate_sensor_readings({"pH": 6.5, "temp": 61, "ec": 1.2})
    assert "Temperature 61°C is outside valid range (-10 to 60°C)" in str(
        exc_info.value
    )


def test_validate_sensor_readings_invalid_ec():
    """Test validation fails for negative EC values."""
    with pytest.raises(InvalidSensorReadingsError) as exc_info:
        validate_sensor_readings({"pH": 6.5, "temp": 22, "ec": -0.1})
    assert "EC value -0.1 cannot be negative" in str(exc_info.value)


def test_validate_timestamp_valid():
    israel_tz = ZoneInfo("Asia/Jerusalem")

    # Past timestamp should be valid
    past_time = datetime.now(israel_tz).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    validate_timestamp(past_time)  # Should not raise

    # Current time should be valid
    current_time = datetime.now(israel_tz)
    validate_timestamp(current_time)  # Should not raise


def test_validate_timestamp_future():
    israel_tz = ZoneInfo("Asia/Jerusalem")

    # Future timestamp should be invalid
    future_time = datetime.now(israel_tz).replace(year=2030)

    with pytest.raises(InvalidTimestampError) as exc_info:
        validate_timestamp(future_time)

    assert "Timestamp cannot be in the future" in str(exc_info.value)
    assert future_time.isoformat() in str(exc_info.value)
