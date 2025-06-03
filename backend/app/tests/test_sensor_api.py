"""Tests for sensor API endpoints."""

import pytest


@pytest.mark.asyncio
async def test_post_sensor_valid_data(client):
    # test healthy reading
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "unit-123",
            "timestamp": "2025-05-24T12:34:56Z",
            "readings": {"pH": 6.5, "temp": 22.1, "ec": 1.2},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert data["classification"] == "Healthy"

    # Test needs attention reading
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "unit-456",
            "timestamp": "2025-05-24T12:35:56Z",
            "readings": {"pH": 8.5, "temp": 22.1, "ec": 1.2},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OK"
    assert data["classification"] == "Needs Attention"


@pytest.mark.asyncio
async def test_post_sensor_invalid_readings(client):
    # invalid pH
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "unit-123",
            "timestamp": "2025-05-24T12:34:56Z",
            "readings": {"pH": 15.0, "temp": 22.1, "ec": 1.2},
        },
    )
    assert response.status_code == 422

    # invalid temperature
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "unit-123",
            "timestamp": "2025-05-24T12:34:56Z",
            "readings": {"pH": 6.5, "temp": -60, "ec": 1.2},
        },
    )
    assert response.status_code == 422

    # invalid EC
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "unit-123",
            "timestamp": "2025-05-24T12:34:56Z",
            "readings": {"pH": 6.5, "temp": 22.1, "ec": -1},
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_post_sensor_missing_fields(client):
    # missing unitId
    response = await client.post(
        "/api/v1/sensor",
        json={
            "timestamp": "2025-05-24T12:34:56Z",
            "readings": {"pH": 6.5, "temp": 22.1, "ec": 1.2},
        },
    )
    assert response.status_code == 422

    # missing readings
    response = await client.post(
        "/api/v1/sensor",
        json={"unitId": "unit-123", "timestamp": "2025-05-24T12:34:56Z"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_alerts_with_data(client):
    readings_data = [
        {"pH": 6.5, "temp": 22.1, "ec": 1.2},  # Healthy
        {"pH": 8.5, "temp": 22.1, "ec": 1.2},  # Needs Attention
        {"pH": 4.0, "temp": 22.1, "ec": 1.2},  # Needs Attention
        {"pH": 6.0, "temp": 22.1, "ec": 1.2},  # Healthy
    ]

    for i, readings in enumerate(readings_data):
        await client.post(
            "/api/v1/sensor",
            json={
                "unitId": "unit-test",
                "timestamp": f"2025-05-24T12:{i:02d}:00Z",
                "readings": readings,
            },
        )

    # get alerts
    response = await client.get("/api/v1/alerts?unitId=unit-test")
    assert response.status_code == 200
    data = response.json()

    assert data["unitId"] == "unit-test"
    assert len(data["alerts"]) == 2  # Should have 2 "Needs Attention" readings

    # Verify alerts are all "Needs Attention"
    for alert in data["alerts"]:
        assert alert["classification"] == "Needs Attention"


@pytest.mark.asyncio
async def test_get_alerts_no_unit_id(client):
    response = await client.get("/api/v1/alerts")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_alerts_empty_unit(client):
    """
    unit with no data returns empty list.
    """
    response = await client.get("/api/v1/alerts?unitId=nonexistent-unit")
    assert response.status_code == 200
    data = response.json()
    assert data["unitId"] == "nonexistent-unit"
    assert data["alerts"] == []


@pytest.mark.asyncio
async def test_get_units_overview(client):
    test_data = [
        (
            "unit-1",
            "2025-05-24T10:00:00Z",
            {"pH": 6.5, "temp": 22, "ec": 1.2},
        ),  # Healthy
        (
            "unit-1",
            "2025-05-24T11:00:00Z",
            {"pH": 8.5, "temp": 22, "ec": 1.2},
        ),  # Needs Attention
        (
            "unit-2",
            "2025-05-24T10:00:00Z",
            {"pH": 6.0, "temp": 22, "ec": 1.2},
        ),  # Healthy
        (
            "unit-3",
            "2025-05-24T10:00:00Z",
            {"pH": 4.0, "temp": 22, "ec": 1.2},
        ),  # Needs Attention
    ]

    for unit_id, timestamp, readings in test_data:
        await client.post(
            "/api/v1/sensor",
            json={"unitId": unit_id, "timestamp": timestamp, "readings": readings},
        )

    # Get units overview
    response = await client.get("/api/v1/units")
    assert response.status_code == 200
    data = response.json()

    assert data["totalUnits"] == 3
    assert len(data["units"]) == 3

    # Check unit-1 details
    unit1 = next(u for u in data["units"] if u["unitId"] == "unit-1")
    assert unit1["totalReadings"] == 2
    assert unit1["alertsCount"] == 1
    assert unit1["healthStatus"] == "warning"  # Has some alerts

    # Check unit-2 details
    unit2 = next(u for u in data["units"] if u["unitId"] == "unit-2")
    assert unit2["totalReadings"] == 1
    assert unit2["alertsCount"] == 0
    assert unit2["healthStatus"] == "healthy"  # No alerts

    # Check unit-3 details
    unit3 = next(u for u in data["units"] if u["unitId"] == "unit-3")
    assert unit3["totalReadings"] == 1
    assert unit3["alertsCount"] == 1
    assert unit3["healthStatus"] == "warning"  # 1 alert in last 10 readings
