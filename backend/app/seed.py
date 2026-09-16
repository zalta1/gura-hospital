"""SYNTHETIC seed data — fictional clinicians and patients. Not real people."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import (
    ConsentRecord,
    DataRetentionPolicy,
    Organization,
    Patient,
    Provider,
    ProviderAvailability,
    Role,
    User,
    UserRole,
)
from app.db.session import SessionLocal, engine
from app.db.base import Base

ORG_TZ = "America/New_York"

PHYSICIANS = [
    ("amara-velloso", "Amara", "Velloso", "MD, FACC", "Cardiology", "cardiology-electrophysiology", "Interventional Cardiology"),
    ("nikolai-brandt", "Nikolai", "Brandt", "MD, PhD", "Cardiac Electrophysiology", "cardiology-electrophysiology", "Catheter Ablation"),
    ("priya-santhanam", "Priya", "Santhanam", "MD, MPH", "Preventive Cardiology", "cardiology-electrophysiology", "Lipid Clinic"),
    ("desmond-okafor", "Desmond", "Okafor", "MD, FASGE", "Gastroenterology", "gastroenterology", "Therapeutic Endoscopy"),
    ("lena-marchetti", "Lena", "Marchetti", "DO", "Gastroenterology", "gastroenterology", "IBD"),
    ("june-castellanos", "June", "Castellanos", "MD, FAAOS", "Orthopedic Surgery", "orthopedics", "Hip & Knee"),
    ("elias-thornbury", "Elias", "Thornbury", "MD", "Sports Medicine", "orthopedics", "Shoulder Arthroscopy"),
    ("reuben-ashford", "Reuben", "Ashford", "MD, FAAN", "Neurology", "neurology", "Stroke"),
    ("imani-fairweather", "Imani", "Fairweather", "MD", "Neurology", "neurology", "Epilepsy"),
    ("aveline-rousseau", "Aveline", "Rousseau", "MD, FACOG", "Obstetrics & Gynecology", "womens-health", "MFM"),
    ("callum-whitfield", "Callum", "Whitfield", "MD, FACP", "Internal Medicine", "primary-care", "Adult Primary Care"),
    ("yuki-tanabe", "Yuki", "Tanabe", "MD", "Family Medicine", "primary-care", "Same-Day Care"),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        org = db.scalar(select(Organization).where(Organization.slug == "gura-hospital"))
        if org:
            print("Seed already present.")
            return
        org = Organization(slug="gura-hospital", name="Gura Hospital", timezone=ORG_TZ)
        db.add(org)
        db.flush()

        def add_user(email: str, name: str, role: Role, password: str) -> User:
            user = User(
                organization_id=org.id,
                email=email,
                password_hash=hash_password(password),
                full_name=name,
            )
            db.add(user)
            db.flush()
            db.add(UserRole(organization_id=org.id, user_id=user.id, role=role))
            return user

        add_user("admin@gura.example", "Gura Administrator", Role.admin, "gura-admin-demo")
        staff = add_user("priya.nair@gura.example", "Priya Nair, RN", Role.staff, "gura-staff-demo")
        agent = add_user("agent@gura.example", "Care Navigation Agent", Role.service_account, "gura-agent-demo")
        _ = staff
        _ = agent

        patient_user = add_user(
            "jordan.avery@patient.example", "Jordan Avery", Role.patient, "gura-patient-demo"
        )
        patient = Patient(
            organization_id=org.id,
            user_id=patient_user.id,
            mrn="GH-10001",
            first_name="Jordan",
            last_name="Avery",
            email="jordan.avery@patient.example",
            phone="555-010-1001",
            preferred_timezone=ORG_TZ,
            ehr_external_id="MOCK-PT-10001",
        )
        db.add(patient)
        db.flush()
        db.add(
            ConsentRecord(
                organization_id=org.id,
                patient_id=patient.id,
                purpose="ai_agent_handling",
                granted=True,
                notes="Synthetic consent for local MVP.",
            )
        )
        db.add(
            Patient(
                organization_id=org.id,
                mrn="GH-10002",
                first_name="Samira",
                last_name="Okoye",
                email="samira.okoye@patient.example",
                phone="555-010-1002",
                preferred_timezone=ORG_TZ,
                ehr_external_id="MOCK-PT-10002",
            )
        )

        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        for slug, first, last, creds, spec, spec_slug, sub in PHYSICIANS:
            email = f"{first.lower()}.{last.lower()}@gura.example"
            user = None
            if slug == "amara-velloso":
                user = add_user(email, f"Dr. {first} {last}", Role.physician, "gura-physician-demo")
            provider = Provider(
                organization_id=org.id,
                user_id=user.id if user else None,
                slug=slug,
                first_name=first,
                last_name=last,
                credentials=creds,
                specialty=spec,
                specialty_slug=spec_slug,
                sub_specialty=sub,
                office="1400 Harborline Ave, Fairmont Ridge, NY 11042",
                phone="555-210-0000",
                timezone=ORG_TZ,
                ehr_external_id=f"MOCK-PRV-{slug}",
            )
            db.add(provider)
            db.flush()
            for day in range(1, 8):
                for hour in (9, 11, 14):
                    start = now + timedelta(days=day, hours=hour - now.hour)
                    db.add(
                        ProviderAvailability(
                            organization_id=org.id,
                            provider_id=provider.id,
                            start_at=start,
                            end_at=start + timedelta(minutes=30),
                            timezone=ORG_TZ,
                            is_open=True,
                        )
                    )

        db.add(
            DataRetentionPolicy(
                organization_id=org.id,
                notes=(
                    "PLACEHOLDER POLICY — TODO legal review. Do not auto-delete PHI. "
                    "Typical medical record retention is 7+ years; state law and HIPAA "
                    "preemption analysis required. Deletion must honor legal holds."
                ),
            )
        )
        db.commit()
        print("Seeded Gura Hospital synthetic directory.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
