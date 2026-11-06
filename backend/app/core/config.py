from enum import Enum
from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEFAULT_SECRET = "INSECURE-LOCAL-DEV-KEY-CHANGE-ME"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    app_name: str = "Gura Care Navigation API"
    environment: str = "local"
    debug: bool = Field(default=True)

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug_field(cls, v):
        if isinstance(v, str):
            lowered = v.lower().strip()
            if lowered in ("true", "1", "yes", "on", "dev", "debug"):
                return True
            if lowered in ("false", "0", "no", "off", "release", "prod", "production"):
                return False
        return bool(v)

    allow_demo_login: bool = True  # Disabled automatically in staging/production
    secret_key: str = Field(
        default=INSECURE_DEFAULT_SECRET,
        description="Loaded from secret manager. Refuses startup in production if insecure default is used.",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:///./gura.db"
    redis_url: str | None = None
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    default_organization_slug: str = "gura-hospital"
    encryption_key: str | None = Field(
        default=None,
        description="32-byte (or 64-char hex / 44-char base64) key for AES-256-GCM field-level PHI encryption.",
    )
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    tool_rate_limit_per_minute: int = 30
    api_rate_limit_per_minute: int = 120
    default_retention_days: int = 2555  # 7 years, typical medical record floor in many US states
    elevenlabs_api_key: str | None = None
    elevenlabs_agent_id: str | None = None

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        env = (self.environment or "local").lower().strip()
        is_production = env in ("production", "staging", "prod")

        if is_production:
            if self.secret_key == INSECURE_DEFAULT_SECRET or len(self.secret_key) < 32:
                raise ValueError(
                    f"CRITICAL SECURITY CONFIGURATION ERROR: secret_key cannot use the default or insecure string in {env}. "
                    "You must provide a strong, 256-bit secret key in your environment variables."
                )
            # Enforce disabling demo login in production
            self.allow_demo_login = False
            # Enforce debug=False in production
            self.debug = False
            # Enforce 30-minute access token lifespan in production
            if self.access_token_expire_minutes > 60:
                self.access_token_expire_minutes = 30
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
