from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, UserRole
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackRead
from app.services.complaint_visibility import can_view_complainant_identity, redact_anonymous_identity

router = APIRouter()


def _is_feedback_complaint_conflict(exc: IntegrityError) -> bool:
    original = exc.orig
    constraint_name = getattr(getattr(original, "diag", None), "constraint_name", None)
    if constraint_name is not None:
        return constraint_name == "feedback_complaint_id_key"
    return "UNIQUE constraint failed: feedback.complaint_id" in str(original)


@router.post("", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    complaint = db.get(Complaint, payload.complaint_id)
    if not complaint or complaint.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if complaint.status != ComplaintStatus.Resolved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Feedback is allowed only after resolution")
    existing = db.scalar(select(Feedback).where(Feedback.complaint_id == complaint.id))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feedback already submitted")
    feedback = Feedback(complaint_id=complaint.id, rating=payload.rating, comment=payload.comment)
    db.add(feedback)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _is_feedback_complaint_conflict(exc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Feedback already submitted") from exc
        raise
    db.refresh(feedback)
    return feedback


@router.get("/{complaint_id}", response_model=FeedbackRead | None)
def get_feedback(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    allowed = (
        current_user.role == UserRole.admin
        or complaint.created_by == current_user.id
        or complaint.assigned_to == current_user.id
    )
    if not allowed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    feedback = db.scalar(select(Feedback).where(Feedback.complaint_id == complaint_id))
    if (
        feedback
        and feedback.comment is not None
        and not can_view_complainant_identity(current_user, complaint)
    ):
        return FeedbackRead.model_validate(feedback).model_copy(
            update={"comment": redact_anonymous_identity(feedback.comment, current_user, complaint)}
        )
    return feedback
