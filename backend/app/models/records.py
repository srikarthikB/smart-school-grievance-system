from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ComplaintAttachment(Base):
    __tablename__ = "complaint_attachments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    uploaded_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    repair_submission_id: Mapped[int | None] = mapped_column(
        ForeignKey("complaint_repair_submissions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    complaint = relationship("Complaint", back_populates="attachments")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    repair_submission = relationship(
        "ComplaintRepairSubmission",
        back_populates="attachments",
        foreign_keys=[repair_submission_id],
    )


class ComplaintRepairSubmission(Base):
    __tablename__ = "complaint_repair_submissions"
    __table_args__ = (
        UniqueConstraint("complaint_id", "request_key", name="uq_repair_request_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    submitted_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    request_key: Mapped[str] = mapped_column(String(36), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    complaint = relationship("Complaint", back_populates="repair_submissions")
    submitter = relationship("User", foreign_keys=[submitted_by])
    attachments = relationship(
        "ComplaintAttachment",
        back_populates="repair_submission",
        foreign_keys="ComplaintAttachment.repair_submission_id",
    )


class ComplaintEvent(Base):
    __tablename__ = "complaint_events"
    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_complaint_event_dedupe_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    dedupe_key: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    complaint = relationship("Complaint", back_populates="events")
    actor = relationship("User", foreign_keys=[actor_id])


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    complaint_id: Mapped[int | None] = mapped_column(
        ForeignKey("complaints.id", ondelete="CASCADE"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", foreign_keys=[user_id])
    complaint = relationship("Complaint", back_populates="notifications")
