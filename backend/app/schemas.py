from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


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

    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})


class AlertsResponse(BaseModel):
    """
    Response model for alerts endpoint.
    """

    unit_id: str = Field(..., alias="unitId")
    alerts: list[SensorDataRecord]
