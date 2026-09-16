"""Initial multi-tenant clinical schema + RLS defense in depth.

Revision ID: 001
"""

from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

# Tables that always carry organization_id
TENANT_TABLES = [
    "users",
    "user_roles",
    "patients",
    "providers",
    "provider_availability",
    "appointments",
    "conversation_sessions",
    "conversation_messages",
    "agent_actions",
    "followup_plans",
    "followup_messages",
    "patient_responses",
    "escalations",
    "consent_records",
    "data_retention_policies",
    "audit_logs",
    "idempotency_keys",
]


def upgrade() -> None:
    # Schema is created by SQLAlchemy metadata in local MVP.
    # This revision installs RLS policies for production-shaped deployments.
    for table in TENANT_TABLES:
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE {table} FORCE ROW LEVEL SECURITY')
        op.execute(
            f"""
            CREATE POLICY tenant_isolation_{table} ON {table}
            USING (organization_id::text = current_setting('app.current_org_id', true))
            WITH CHECK (organization_id::text = current_setting('app.current_org_id', true))
            """
        )
    op.execute(
        """
        COMMENT ON TABLE consent_records IS
        'Patient consent for AI-agent handling of data. TODO: legal review of language.';
        """
    )
    op.execute(
        """
        COMMENT ON TABLE data_retention_policies IS
        'PLACEHOLDER retention/deletion policy. TODO: production legal review before enforcement.';
        """
    )
    op.execute(
        """
        COMMENT ON TABLE conversation_messages IS
        'Append-only conversation transcript. Do not UPDATE or DELETE in application code.';
        """
    )
    op.execute(
        """
        COMMENT ON TABLE agent_actions IS
        'Append-only tool-call and decision log linked to session and user.';
        """
    )


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
