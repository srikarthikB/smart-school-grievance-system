"""Add per-user token versioning.

Revision ID: 0003_user_token_version
Revises: 0002_evidence_notify_timeline
Create Date: 2026-10-17
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_user_token_version"
down_revision = "0002_evidence_notify_timeline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_version")
