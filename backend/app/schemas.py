from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


class SensorReadings(BaseModel):
    """
    Sensor readings containing pH, temperature, and electrical conductivity.
    """

    pH: Annotated[
        float,
        Field(ge=0, le=14, description="pH level (0-14)"),
    ]
    temp: Annotated[float, Field(ge=-50, le=100, description="Temperature in Celsius")]
    ec: Annotated[
        float, Field(ge=0, le=10, description="Electrical conductivity in mS/cm")
    ]


class SensorDataInput(BaseModel):
    """
    Input model for sensor data submission.
    """

    unit_id: Annotated[
        str,
        Field(
            min_length=1,
            description="Unique identifier for the hydroponic unit",
            alias="unitId",
        ),
    ]
    timestamp: Annotated[
        datetime, Field(description="ISO 8601 timestamp of the reading")
    ]
    readings: SensorReadings

    @field_validator("unit_id")
    @classmethod
    def validate_unit_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("unit_id cannot be empty or whitespace")
        return v.strip()


class ClassificationStatus(BaseModel):
    """
    Response model for sensor data classification.
    """

    status: Annotated[str, Field(default="OK", description="Request processing status")]
    classification: Annotated[
        str, Field(description="Health classification: 'Healthy' or 'Needs Attention'")
    ]


class SensorDataRecord(BaseModel):
    """
    Complete sensor data record with classification.
    """

    unit_id: str = Field(..., alias="unitId")
    timestamp: datetime
    readings: SensorReadings
    classification: str

    @field_serializer("timestamp")
    def serialize_timestamp(self, timestamp: datetime) -> str:
        return timestamp.isoformat()

    model_config = ConfigDict(populate_by_name=True)


class AlertsResponse(BaseModel):
    """
    Response model for alerts endpoint.
    """

    unit_id: str = Field(..., alias="unitId")
    alerts: list[SensorDataRecord]
    unit_exists: bool = Field(
        ..., alias="unitExists", description="Whether the unit has any readings"
    )
    total_readings: int = Field(
        ..., alias="totalReadings", description="Total number of readings for this unit"
    )

    model_config = ConfigDict(populate_by_name=True)


class UnitStatus(BaseModel):
    """
    Status information for a single hydroponic unit.
    """

    unit_id: str = Field(..., alias="unitId")
    last_reading: SensorDataRecord | None = Field(
        None, alias="lastReading", description="Most recent sensor reading"
    )
    total_readings: int = Field(
        ..., alias="totalReadings", description="Total number of readings for this unit"
    )
    alerts_count: int = Field(
        ..., alias="alertsCount", description="Number of 'Needs Attention' readings"
    )
    health_status: str = Field(
        ...,
        alias="healthStatus",
        description="Overall health: 'healthy', 'warning', or 'critical'",
    )


class UnitsResponse(BaseModel):
    """
    Response model for units overview endpoint.
    """

    units: list[UnitStatus]
    total_units: int = Field(..., alias="totalUnits")
