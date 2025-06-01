import functools
from pathlib import Path
from typing import Annotated, Any

from pydantic import AnyUrl, BeforeValidator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
DOTENV = Path(BASE_DIR, ".env")


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=DOTENV, env_ignore_empty=True, extra="ignore"
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str
    FRONTEND_HOST: str = "http://localhost:5173"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]


@functools.cache
def get_settings() -> Settings:
    """
    We're using `cache` decorator to re-use the same Settings object,
    instead of reading it for each request. The Settings object will be
    created only once, the first time it's called. Then it will return
    the same object that was returned on the first call, again and again.
    """

    return Settings(_env_file=DOTENV, _env_file_encoding="utf-8")


config = get_settings()
