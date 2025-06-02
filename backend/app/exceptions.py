"""
Custom exceptions for the HydroSense Monitor API.

Each exception maps to a specific HTTP status code and includes context about why the error occurred.
"""

from fastapi import HTTPException, status


class HydroSenseError(HTTPException):
    """
    Base exception for all HydroSense-specific errors.
    """

    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class InvalidSensorReadingsError(HydroSenseError):
    """
    Raised when sensor readings are outside physical limits.

    This typically happens when malfunctioning sensors report impossible values
    like negative pH or temperatures below absolute zero. Early detection prevents bad data from corrupting our analytics.
    """

    def __init__(self, detail: str = "Sensor readings contain invalid values"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
        )


class InvalidTimestampError(HydroSenseError):
    """
    Raised when timestamps are illogical (e.g., future dates).

    Accurate timestamps are crucial for trend analysis. Future timestamps might
    indicate clock sync issues on the sensor device.
    """

    def __init__(
        self, timestamp: str, reason: str = "Timestamp cannot be in the future"
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timestamp '{timestamp}': {reason}",
        )
