from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.agents.context import SessionContext
from app.agents.orchestrator import handle_user_message
from app.core.security import decode_token
from app.db.models import ConversationSession, Patient, Role
from app.db.session import SessionLocal, apply_tenant_guc

router = APIRouter()


def _ctx_from_token(db, token: str, session_id: UUID) -> SessionContext:
    payload = decode_token(token)
    role = Role(payload["role"])
    org = UUID(payload["org"])
    user_id = UUID(payload["sub"])
    apply_tenant_guc(db, str(org), role.value)
    session = db.get(ConversationSession, session_id)
    if not session or session.organization_id != org:
        raise ValueError("Unknown conversation.")
    patient_id = UUID(payload["patient_id"]) if payload.get("patient_id") else session.patient_id
    if patient_id is None:
        patient_id = db.scalar(select(Patient.id).where(Patient.user_id == user_id))
    return SessionContext(
        user_id=user_id,
        organization_id=org,
        role=role,
        patient_id=patient_id,
        conversation_session_id=session_id,
        is_agent=role == Role.service_account,
    )


@router.websocket("/ws/intake/{session_id}")
async def intake_socket(websocket: WebSocket, session_id: UUID, token: str = Query(...)) -> None:
    await websocket.accept()
    db = SessionLocal()
    try:
        ctx = _ctx_from_token(db, token, session_id)
        await websocket.send_json(
            {
                "type": "system",
                "role": "system",
                "content": "Connected. Licensed clinicians remain responsible for clinical decisions.",
            }
        )
        while True:
            raw = await websocket.receive_json()
            text = str(raw.get("content") or raw.get("text") or "").strip()
            if not text:
                continue
            reply = handle_user_message(db, ctx, text)
            db.commit()
            await websocket.send_json({"type": "message", "role": "assistant", "content": reply})
    except WebSocketDisconnect:
        db.rollback()
    except Exception as exc:
        db.rollback()
        try:
            await websocket.send_json({"type": "error", "content": str(exc)})
            await websocket.close()
        except Exception:
            pass
    finally:
        db.close()
