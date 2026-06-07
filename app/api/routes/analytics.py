from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.enums import ComplaintStatus, UserRole
from app.models.user import User
from app.schemas.analytics import AnalyticsRead, CountBucket

router = APIRouter()


@router.get("", response_model=AnalyticsRead)
def analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    total = db.scalar(select(func.count(Complaint.id))) or 0
    resolved = db.scalar(select(func.count(Complaint.id)).where(Complaint.status == ComplaintStatus.Resolved)) or 0
    by_category = db.execute(select(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category)).all()
    by_status = db.execute(select(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status)).all()
    return AnalyticsRead(
        total_complaints=total,
        complaints_by_category=[CountBucket(name=row[0].value, count=row[1]) for row in by_category],
        complaints_by_status=[CountBucket(name=row[0].value, count=row[1]) for row in by_status],
        resolution_rate=round((resolved / total) * 100, 2) if total else 0.0,
    )
