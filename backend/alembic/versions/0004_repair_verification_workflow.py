"""Add repair attempts and verification workflow audit fields.

Revision ID: 0004_repair_verification_workflow
Revises: 0003_user_token_version
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_repair_verification_workflow"
down_revision = "0003_user_token_version"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TYPE complaint_status "
        "ADD VALUE IF NOT EXISTS 'Awaiting Verification'"
    )
    op.create_table(
        "complaint_repair_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("complaint_id", sa.Integer(), nullable=False),
        sa.Column("submitted_by", sa.Integer(), nullable=False),
        sa.Column("request_key", sa.String(length=36), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("complaint_id", "request_key", name="uq_repair_request_key"),
    )
    op.create_index(
        "ix_complaint_repair_submissions_id",
        "complaint_repair_submissions",
        ["id"],
    )
    op.create_index(
        "ix_complaint_repair_submissions_complaint_id",
        "complaint_repair_submissions",
        ["complaint_id"],
    )
    op.add_column(
        "complaint_attachments",
        sa.Column("repair_submission_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_complaint_attachments_repair_submission",
        "complaint_attachments",
        "complaint_repair_submissions",
        ["repair_submission_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "complaint_events",
        sa.Column("dedupe_key", sa.String(length=160), nullable=True),
    )
    op.create_unique_constraint(
        "uq_complaint_event_dedupe_key",
        "complaint_events",
        ["dedupe_key"],
    )


def downgrade() -> None:
    raise RuntimeError(
        "This migration cannot be downgraded safely: it would discard repair history, "
        "and PostgreSQL cannot remove the added enum value without recreating the type."
    )
