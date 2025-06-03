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


@pytest.mark.asyncio
async def test_out_of_order_timestamps(client):
    """
    Production-critical test:
    Make sure system handles out-of-order timestamps correctly.

    In production, sensors might send readings with timestamps that are not in
    chronological order due to network delays, buffering, or clock sync issues.
    We should accept and store them correctly, maintaining proper ordering.
    """
    # send readings out of chronological order
    readings_data = [
        ("2025-05-24T14:00:00Z", {"pH": 6.5, "temp": 22.1, "ec": 1.2}),  # Latest
        (
            "2025-05-24T10:00:00Z",
            {"pH": 8.5, "temp": 22.1, "ec": 1.2},
        ),  # Earliest (needs attention)
        (
            "2025-05-24T12:00:00Z",
            {"pH": 4.0, "temp": 22.1, "ec": 1.2},
        ),  # Middle (needs attention)
        ("2025-05-24T13:00:00Z", {"pH": 6.0, "temp": 22.1, "ec": 1.2}),
        # Second latest
    ]

    # submit readings in non-chronological order
    for timestamp, readings in readings_data:
        response = await client.post(
            "/api/v1/sensor",
            json={
                "unitId": "unit-ooo-test",
                "timestamp": timestamp,
                "readings": readings,
            },
        )
        assert response.status_code == 200

    # get alerts - should be ordered by timestamp descending
    response = await client.get("/api/v1/alerts?unitId=unit-ooo-test")
    assert response.status_code == 200
    data = response.json()

    # should have 2 alerts (pH 8.5 and pH 4.0)
    assert len(data["alerts"]) == 2

    # Verify alerts are returned in descending timestamp order
    timestamps = [alert["timestamp"] for alert in data["alerts"]]
    assert timestamps[0] == "2025-05-24T12:00:00+00:00"  # More recent alert first
    assert timestamps[1] == "2025-05-24T10:00:00+00:00"  # Older alert second

    # Verify the correct readings are flagged as alerts
    assert data["alerts"][0]["readings"]["pH"] == 4.0
    assert data["alerts"][1]["readings"]["pH"] == 8.5


@pytest.mark.asyncio
async def test_malformed_json_payload(client):
    """
    Production-critical test:
    Ensure API handles malformed JSON gracefully.

    In production, users might send malformed JSON due to bugs, network issues,
    or malicious attempts. Our API should respond with appropriate error messages without crashing or exposing internal details.
    """
    # invalid JSON syntax
    response = await client.post(
        "/api/v1/sensor",
        content='{"unitId": "test", "timestamp": "2025-05-24T10:00:00Z", "readings": {"pH": 6.5, "temp": 22.1, "ec": }',  # Missing value
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422

    # wrong data types in readings
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "test",
            "timestamp": "2025-05-24T10:00:00Z",
            "readings": {
                "pH": "six point five",
                "temp": "warm",
                "ec": "low",
            },  # Strings instead of numbers
        },
    )
    assert response.status_code == 422
    error_detail = response.json()["detail"]
    # should have validation errors for all three fields
    assert len(error_detail) >= 3

    # extra fields that shouldn't exist
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "test",
            "timestamp": "2025-05-24T10:00:00Z",
            "readings": {"pH": 6.5, "temp": 22.1, "ec": 1.2},
            "extraField": "should not be here",
            "anotherExtra": 123,
        },
    )
    # Should still accept (Pydantic ignores extra fields by default)
    assert response.status_code == 200

    # nested structure errors
    response = await client.post(
        "/api/v1/sensor",
        json={
            "unitId": "test",
            "timestamp": "2025-05-24T10:00:00Z",
            "readings": "not an object",  # Should be an object, not a string
        },
    )
    assert response.status_code == 422

    response = await client.post(
        "/api/v1/sensor",
        json=[
            "unitId",
            "test",
            "timestamp",
            "2025-05-24T10:00:00Z",
        ],  # list instead of object
    )
    assert response.status_code == 422
