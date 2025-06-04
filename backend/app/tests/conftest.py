import pytest
from backend.app.api.routes.sensor import SENSOR_READINGS_STORE
from backend.app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture(autouse=True)
def clear_store():
    """
    Clear the sensor readings store before each test.
    """
    SENSOR_READINGS_STORE.clear()
    yield
    SENSOR_READINGS_STORE.clear()


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
