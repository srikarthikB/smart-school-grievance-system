from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, UserRole
from app.models.user import User
from app.schemas.complaint import (
    AssignComplaintRequest,
    ComplaintCreate,
    ComplaintRead,
    ComplaintUpdate,
    ResolutionNotesRequest,
    StatusUpdateRequest,
)
from app.services.complaint_visibility import can_view_complaint, serialize_complaint_for_user

router = APIRouter()


def complaint_query():
    return select(Complaint).options(joinedload(Complaint.creator), joinedload(Complaint.assignee))


def get_visible_complaint_or_404(complaint_id: int, user: User, db: Session) -> Complaint:
    complaint = db.scalar(complaint_query().where(Complaint.id == complaint_id))
    if not complaint or not can_view_complaint(user, complaint):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return complaint


@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    complaint = Complaint(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        is_anonymous=payload.is_anonymous,
        created_by=current_user.id,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/mine", response_model=list[ComplaintRead])
def my_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    return db.scalars(
        complaint_query()
        .where(Complaint.created_by == current_user.id)
        .order_by(Complaint.created_at.desc())
    ).all()


@router.get("/assigned", response_model=list[ComplaintRead])
def assigned_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.staff)),
):
    complaints = db.scalars(
        complaint_query()
        .where(Complaint.assigned_to == current_user.id)
        .order_by(Complaint.created_at.desc())
    ).all()
    return [serialize_complaint_for_user(complaint, current_user) for complaint in complaints]


@router.get("", response_model=list[ComplaintRead])
def all_complaints(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return db.scalars(complaint_query().order_by(Complaint.created_at.desc())).all()


@router.get("/{complaint_id}", response_model=ComplaintRead)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    return serialize_complaint_for_user(complaint, current_user)


@router.patch("/{complaint_id}", response_model=ComplaintRead)
def update_complaint(
    complaint_id: int,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    data = payload.model_dump(exclude_unset=True)

    if current_user.role == UserRole.student:
        allowed = {"title", "description", "category", "priority"}
        if complaint.status != ComplaintStatus.Submitted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only submitted complaints can be edited")
        data = {key: value for key, value in data.items() if key in allowed}
    elif current_user.role == UserRole.staff:
        allowed = {"status", "resolution_notes"}
        data = {key: value for key, value in data.items() if key in allowed}
    elif current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")

    for key, value in data.items():
        setattr(complaint, key, value)
    db.commit()
    db.refresh(complaint)
    return serialize_complaint_for_user(complaint, current_user)


@router.patch("/{complaint_id}/assign", response_model=ComplaintRead)
def assign_complaint(
    complaint_id: int,
    payload: AssignComplaintRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    staff = db.get(User, payload.staff_id)
    if not staff or staff.role != UserRole.staff:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee must be a staff user")
    complaint.assigned_to = staff.id
    if complaint.status == ComplaintStatus.Submitted:
        complaint.status = ComplaintStatus.UnderReview
    db.commit()
    db.refresh(complaint)
    return complaint


@router.patch("/{complaint_id}/status", response_model=ComplaintRead)
def change_status(
    complaint_id: int,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.staff, UserRole.admin)),
):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    complaint.status = payload.status
    if payload.resolution_notes is not None:
        complaint.resolution_notes = payload.resolution_notes
    db.commit()
    db.refresh(complaint)
    return serialize_complaint_for_user(complaint, current_user)


@router.patch("/{complaint_id}/resolution", response_model=ComplaintRead)
def add_resolution_notes(
    complaint_id: int,
    payload: ResolutionNotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.staff, UserRole.admin)),
):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    complaint.resolution_notes = payload.resolution_notes
    db.commit()
    db.refresh(complaint)
    return serialize_complaint_for_user(complaint, current_user)
