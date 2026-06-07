"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    user_role = sa.Enum("student", "staff", "admin", name="user_role")
    department = sa.Enum("Academic", "Discipline", "Infrastructure", "Transport", "Administration", name="department")
    complaint_category = sa.Enum(
        "Academic",
        "Faculty",
        "Student",
        "Infrastructure",
        "Transport",
        "Administration",
        "Other",
        name="complaint_category",
    )
    complaint_priority = sa.Enum("Low", "Medium", "High", name="complaint_priority")
    complaint_status = sa.Enum("Submitted", "Under Review", "In Progress", "Resolved", "Rejected", name="complaint_status")

    # user_role.create(op.get_bind(), checkfirst=True)
    # department.create(op.get_bind(), checkfirst=True)
    # complaint_category.create(op.get_bind(), checkfirst=True)
    # complaint_priority.create(op.get_bind(), checkfirst=True)
    # complaint_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("department", department, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "complaints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", complaint_category, nullable=False),
        sa.Column("priority", complaint_priority, nullable=False),
        sa.Column("status", complaint_status, nullable=False),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("assigned_to", sa.Integer(), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_complaints_id"), "complaints", ["id"], unique=False)

    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("complaint_id", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="feedback_rating_range"),
        sa.ForeignKeyConstraint(["complaint_id"], ["complaints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("complaint_id"),
    )
    op.create_index(op.f("ix_feedback_id"), "feedback", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_id"), table_name="feedback")
    op.drop_table("feedback")
    op.drop_index(op.f("ix_complaints_id"), table_name="complaints")
    op.drop_table("complaints")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    sa.Enum(name="complaint_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="complaint_priority").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="complaint_category").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="department").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
