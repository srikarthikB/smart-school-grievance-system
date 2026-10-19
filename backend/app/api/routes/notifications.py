from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.records import Notification
from app.models.user import User
from app.services.complaint_visibility import redact_anonymous_identity

router = APIRouter()

@router.get("/mine")
def my_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(
        select(Notification)
        .options(joinedload(Notification.complaint))
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    ).all()
    return [
        {
            "id": notification.id,
            "complaint_id": notification.complaint_id,
            "title": redact_anonymous_identity(
                notification.title,
                user,
                notification.complaint,
            )
            if notification.complaint
            else notification.title,
            "message": redact_anonymous_identity(
                notification.message,
                user,
                notification.complaint,
            )
            if notification.complaint
            else notification.message,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
        }
        for notification in rows
    ]

@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.get(Notification, notification_id)
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.is_read = True
    db.commit()
    return {"ok": True}

@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.is_read.is_(False))).all()
    for row in rows: row.is_read = True
    db.commit()
    return {"ok": True, "updated": len(rows)}
