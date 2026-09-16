from fastapi import APIRouter

from app.api.routes import appointments, auth, escalations, followups, intake, providers, reviews, voice
from app.api.ws import router as ws_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(intake.router)
api_router.include_router(providers.router)
api_router.include_router(appointments.router)
api_router.include_router(followups.router)
api_router.include_router(escalations.router)
api_router.include_router(reviews.router)
api_router.include_router(voice.router)


def include_ws(app) -> None:
    app.include_router(ws_router)
