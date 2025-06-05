from datetime import datetime

import pytest
from pydantic import ValidationError

from app.schemas import SensorDataInput, SensorReadings


def test_valid_sensor_readings():
    readings = SensorReadings(pH=6.5, temp=22.1, ec=1.2)
    assert readings.pH == 6.5
    assert readings.temp == 22.1
    assert readings.ec == 1.2


def test_ph_range_validation():
    """
    pH must be between 0 and 14.
    """
    # valid edge cases
    SensorReadings(pH=0.0, temp=20, ec=1.0)
    SensorReadings(pH=14.0, temp=20, ec=1.0)

    # invalid cases
    with pytest.raises(ValidationError) as exc_info:
        SensorReadings(pH=-0.1, temp=20, ec=1.0)
    assert "greater than or equal to 0" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SensorReadings(pH=14.1, temp=20, ec=1.0)
    assert "less than or equal to 14" in str(exc_info.value)


def test_temperature_range_validation():
    """
    Temperature must be between -50 and 100.
    """
    # valid edge cases
    SensorReadings(pH=6.5, temp=-50, ec=1.0)
    SensorReadings(pH=6.5, temp=100, ec=1.0)

    # invalid cases
    with pytest.raises(ValidationError) as exc_info:
        SensorReadings(pH=6.5, temp=-51, ec=1.0)
    assert "greater than or equal to -50" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SensorReadings(pH=6.5, temp=101, ec=1.0)
    assert "less than or equal to 100" in str(exc_info.value)


def test_ec_range_validation():
    """
    EC must be between 0 and 10.
    """
    # valid edge cases
    SensorReadings(pH=6.5, temp=20, ec=0.0)
    SensorReadings(pH=6.5, temp=20, ec=10.0)

    # invalid cases
    with pytest.raises(ValidationError) as exc_info:
        SensorReadings(pH=6.5, temp=20, ec=-0.1)
    assert "greater than or equal to 0" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SensorReadings(pH=6.5, temp=20, ec=10.1)
    assert "less than or equal to 10" in str(exc_info.value)


def test_valid_sensor_data_input():
    data = SensorDataInput(
        unitId="unit-123",
        timestamp=datetime(2025, 5, 24, 12, 34, 56),
        readings=SensorReadings(pH=6.5, temp=22.1, ec=1.2),
    )
    assert data.unit_id == "unit-123"
    assert data.timestamp == datetime(2025, 5, 24, 12, 34, 56)
    assert data.readings.pH == 6.5


def test_unit_id_validation():
    """
    unit_id must not be empty or whitespace.
    """
    # valid cases - whitespace should be trimmed
    data = SensorDataInput(
        unitId="  unit-123  ",
        timestamp=datetime.now(),
        readings=SensorReadings(pH=6.5, temp=22, ec=1.0),
    )
    assert data.unit_id == "unit-123"

    # invalid cases
    with pytest.raises(ValidationError) as exc_info:
        SensorDataInput(
            unitId="",
            timestamp=datetime.now(),
            readings=SensorReadings(pH=6.5, temp=22, ec=1.0),
        )
    assert "String should have at least 1 character" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SensorDataInput(
            unitId="   ",
            timestamp=datetime.now(),
            readings=SensorReadings(pH=6.5, temp=22, ec=1.0),
        )
    assert "unit_id cannot be empty or whitespace" in str(exc_info.value)


def test_missing_required_fields():
    with pytest.raises(ValidationError) as exc_info:
        SensorDataInput(unitId="unit-123", timestamp=datetime.now())
    assert "readings" in str(exc_info.value)
    assert "Field required" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SensorDataInput(
            unitId="unit-123", readings=SensorReadings(pH=6.5, temp=22, ec=1.0)
        )
    assert "timestamp" in str(exc_info.value)
    assert "Field required" in str(exc_info.value)
