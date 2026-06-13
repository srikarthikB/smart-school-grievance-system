from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import Department, UserRole, enum_values


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role", values_callable=enum_values), nullable=False)
    department: Mapped[Department | None] = mapped_column(Enum(Department, name="department", values_callable=enum_values), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # BUG-04: Incrementing this value invalidates all previously issued JWTs
    # for this user without needing a token blocklist or Redis.
    # Bump it in any endpoint that changes role, password, or handles logout.
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_complaints = relationship(
        "Complaint",
        foreign_keys="Complaint.created_by",
        back_populates="creator",
    )
    assigned_complaints = relationship(
        "Complaint",
        foreign_keys="Complaint.assigned_to",
        back_populates="assignee",
    )