# Gura Hospital

Academic medical center website (React / TanStack Start) and an AI-powered **care navigation** API (FastAPI + PostgreSQL). Licensed clinicians remain responsible for all clinical decisions. The agent never has raw database credentials and can only call named, authorized tools.

This is a **hackathon MVP** with **synthetic** patients and providers. It is not a live medical service.

## What changed from the Lovable template

- Lovable Vite plugin, editor telemetry, and watermarks removed
- Institutional visual system (IBM Plex Sans, Libre Baskerville, photography, gold rule)
- Backend replaced with FastAPI, multi-tenant Postgres, WebSockets, and HITL review

## Architecture

```
Patient (web) ──REST / WebSocket──► FastAPI
                                      ├── JWT auth + role checks
                                      ├── Agent tools (authorized per session)
                                      ├── PostgreSQL (tenant_id on every clinical table)
                                      ├── Mock EHR adapter (swap later without changing agents)
                                      └── APScheduler (approved follow-up reminders)
Staff portal ──► /reviews/pending  (approve follow-up plans and clinical messages)
```

### Multi-tenancy

Every clinical table includes `organization_id`. The MVP seeds one hospital (`gura-hospital`). PostgreSQL RLS policies (Alembic `001_rls`) are defense in depth; the API still filters by tenant.

### Roles

`patient` · `physician` · `staff` · `admin` · `service_account` (the agent)

Enforced on routes (`require_roles`) and inside every tool (`SessionContext`).

### Agent tools

`get_patient_profile` (minimum-necessary fields only), `save_intake_information`, `search_providers`, `get_provider_availability`, `create_appointment`, `cancel_appointment`, `reschedule_appointment`, `send_patient_message`, `create_followup_plan`, `record_patient_response`, `create_escalation`.

**Auto-execute:** profile, intake, search, availability, scheduling, recording a patient reply.  
**Pending review:** follow-up plans and clinically adjacent outbound messages.  
**Immediate staff flag:** escalations (including emergency keyword detection).

Scheduling uses `SELECT … FOR UPDATE`, a partial unique index on `(organization_id, provider_id, start_at)` for non-cancelled rows, and idempotency keys. Appointments store provider and patient timezones; instants are `timestamptz`.

### Consent and retention

`consent_records` captures AI-agent handling consent. `data_retention_policies` is a **placeholder** (7-year floor, legal hold on). Do not auto-delete PHI until counsel signs off.

## Local setup

### Prerequisites

- Node 22+ (or Bun)
- Python 3.12+
- Docker Desktop (for PostgreSQL), or a local Postgres 16

### 1. Database

```bash
docker compose up db -d
```

### 2. API

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
copy ..\.env.example ..\.env    # then edit if needed
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs  
Health: http://127.0.0.1:8000/health

### 3. Website

```bash
npm install
npm run dev
```

Open http://localhost:3000. Vite proxies `/api` and `/ws` to the API when `VITE_API_URL` is unset (defaults to `/api`). For a direct API URL set `VITE_API_URL=http://127.0.0.1:8000` in `.env`.

### One-command stack

```bash
docker compose up --build
```

### Tests

```bash
cd backend
pytest
```

### Seeded accounts (synthetic)

| Persona | Email | Password |
| --- | --- | --- |
| Patient | jordan.avery@patient.example | gura-patient-demo |
| Staff | priya.nair@gura.example | gura-staff-demo |
| Physician | amara.velloso@gura.example | gura-physician-demo |
| Admin | admin@gura.example | gura-admin-demo |

Staff review queue: http://localhost:3000/staff/reviews

## Production TODOs (required before real PHI)

- [ ] HIPAA security risk analysis, policies, and workforce training
- [ ] Business associate agreements with hosting, LLM, and EHR vendors
- [ ] Disable `/auth/demo-login`; replace with enterprise IdP (OIDC/SAML)
- [ ] httpOnly cookies, CSRF, and short-lived tokens
- [ ] Field-level encryption (`ENCRYPTION_KEY` + KMS) — see `app/core/encryption.py`
- [ ] Real EHR adapter (Epic FHIR / Cerner) behind `app/ehr/base.py`
- [ ] Clinical validation of the agent; human remains accountable
- [ ] SIEM-backed append-only audit; no PHI in application logs
- [ ] Network isolation, WAF, backups, and break-glass access
- [ ] Legal review of consent language and retention/deletion
- [ ] Penetration test and rate-limit tuning for agent loops

## Layout

```
src/                 Public hospital site
backend/app/         FastAPI application
backend/alembic/     RLS migration
backend/tests/       Authz, HITL, and scheduling invariants
```
