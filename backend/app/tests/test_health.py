import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/healthcheck")
    assert response.status_code == 200
    assert response.json() == {"status": "Server is running!"}
