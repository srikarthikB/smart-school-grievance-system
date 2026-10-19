from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = Field(..., alias="DATABASE_URL")
    secret_key: str = Field(..., min_length=32, alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(1440, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    backend_cors_origins: str = Field(
        "http://localhost:5173,http://127.0.0.1:5173",
        alias="BACKEND_CORS_ORIGINS",
    )
    verification_reminder_hours: int = Field(24, ge=1, alias="VERIFICATION_REMINDER_HOURS")
    verification_review_hours: int = Field(72, ge=1, alias="VERIFICATION_REVIEW_HOURS")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("backend_cors_origins")
    @classmethod
    def reject_wildcard_cors_origin(cls, value: str) -> str:
        if "*" in {origin.strip() for origin in value.split(",")}:
            raise ValueError("BACKEND_CORS_ORIGINS must list explicit origins; wildcard origins are not allowed")
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
