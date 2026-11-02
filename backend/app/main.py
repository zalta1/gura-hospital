from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router, include_ws
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.rate_limit import limiter
from app.db.base import Base
from app.db.session import engine
from app.jobs.runner import start_scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    # In development/local, auto-create tables for developer velocity.
    # In production/staging, database schema must be managed strictly via Alembic migrations.
    if settings.environment.lower() in ("local", "dev", "development", "test"):
        Base.metadata.create_all(bind=engine)
    start_scheduler()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        description=(
            "AI-powered healthcare navigation API. Agents call named tools only. "
            "Clinicians remain responsible for clinical decisions."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    )

    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        client = request.client.host if request.client else "unknown"
        limiter.check(f"ip:{client}", limit=settings.api_rate_limit_per_minute, window_seconds=60)
        return await call_next(request)

    register_exception_handlers(app)
    app.include_router(api_router)
    include_ws(app)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "environment": settings.environment}

    return app


app = create_app()
