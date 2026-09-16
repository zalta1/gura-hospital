from enum import Enum
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    app_name: str = "Gura Care Navigation API"
    environment: str = "local"
    debug: bool = True
    secret_key: str = Field(
        default="INSECURE-LOCAL-DEV-KEY-CHANGE-ME",
        description="TODO(HIPAA): load from a secret manager; never ship the default.",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:///./gura.db"
    redis_url: str | None = None
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    default_organization_slug: str = "gura-hospital"
    encryption_key: str | None = Field(
        default=None,
        description="TODO(HIPAA): 32-byte key for AES-GCM field-level PHI encryption.",
    )
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    tool_rate_limit_per_minute: int = 30
    api_rate_limit_per_minute: int = 120
    # Placeholder retention — TODO: legal review before production.
    default_retention_days: int = 2555  # 7 years, typical medical record floor in many US states
    elevenlabs_api_key: str | None = None
    elevenlabs_agent_id: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
