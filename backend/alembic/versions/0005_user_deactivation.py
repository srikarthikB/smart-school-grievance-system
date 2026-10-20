"""Add user account deactivation status.

Revision ID: 0005_user_deactivation
Revises: 0004_repair_verification
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_user_deactivation"
down_revision = "0004_repair_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("users", "is_active", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "is_active")
