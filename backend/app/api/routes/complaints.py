from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.core.config import get_settings
from app.models.records import (
    ComplaintAttachment,
    ComplaintEvent,
    ComplaintRepairSubmission,
    Notification,
)

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
from app.schemas.repair import (
    AdminNonResponseClosureRequest,
    AdminRepairReturnRequest,
    ReminderRequest,
    RepairVerificationRequest,
)
from app.services.complaint_visibility import (
    can_view_complainant_identity,
    can_view_complaint,
    redact_anonymous_identity,
    serialize_complaint_for_user,
)

router = APIRouter()
MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _is_event_dedupe_conflict(exc: IntegrityError) -> bool:
    original = exc.orig
    constraint_name = getattr(getattr(original, "diag", None), "constraint_name", None)
    if constraint_name is not None:
        return constraint_name == "uq_complaint_event_dedupe_key"
    return "UNIQUE constraint failed: complaint_events.dedupe_key" in str(original)


def add_event(
    db: Session,
    complaint_id: int,
    actor_id: int | None,
    event_type: str,
    message: str,
    dedupe_key: str | None = None,
) -> bool:
    if dedupe_key and db.scalar(
        select(ComplaintEvent.id).where(ComplaintEvent.dedupe_key == dedupe_key)
    ):
        return False
    event = ComplaintEvent(
        complaint_id=complaint_id,
        actor_id=actor_id,
        event_type=event_type,
        message=message,
        dedupe_key=dedupe_key,
    )
    if not dedupe_key:
        db.add(event)
        return True

    try:
        with db.begin_nested():
            db.add(event)
            db.flush()
    except IntegrityError as exc:
        if _is_event_dedupe_conflict(exc) and db.scalar(
            select(ComplaintEvent.id).where(ComplaintEvent.dedupe_key == dedupe_key)
        ):
            return False
        raise
    return True


def notify_user(db: Session, user_id: int | None, complaint: Complaint, title: str, message: str) -> None:
    if user_id is not None:
        db.add(Notification(user_id=user_id, complaint_id=complaint.id, title=title, message=message))


def notify_admins(db: Session, complaint: Complaint, title: str, message: str) -> None:
    admin_ids = db.scalars(select(User.id).where(User.role == UserRole.admin)).all()
    for admin_id in admin_ids:
        notify_user(db, admin_id, complaint, title, message)


def verified_image(file: UploadFile, data: bytes) -> None:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG, WEBP, or GIF image")
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be smaller than 5 MB")
    signatures = {
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": data.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": len(data) > 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP",
    }
    if not signatures[file.content_type]:
        raise HTTPException(status_code=400, detail="The uploaded file does not appear to be a valid image")


def utc_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def repair_history_payload(db: Session, complaint: Complaint, user: User) -> list[dict]:
    submissions = db.scalars(
        select(ComplaintRepairSubmission)
        .options(joinedload(ComplaintRepairSubmission.submitter))
        .where(ComplaintRepairSubmission.complaint_id == complaint.id)
        .order_by(ComplaintRepairSubmission.submitted_at.asc(), ComplaintRepairSubmission.id.asc())
    ).unique().all()
    attachment_rows = db.scalars(
        select(ComplaintAttachment)
        .where(
            ComplaintAttachment.complaint_id == complaint.id,
            ComplaintAttachment.repair_submission_id.in_([item.id for item in submissions]),
        )
        .order_by(ComplaintAttachment.created_at.asc())
    ).all() if submissions else []
    attachments_by_repair: dict[int, list[dict]] = {}
    for item in attachment_rows:
        attachments_by_repair.setdefault(item.repair_submission_id, []).append(
            {
                "id": item.id,
                "filename": redact_anonymous_identity(item.filename, user, complaint),
                "content_type": item.content_type,
                "size_bytes": item.size_bytes,
                "created_at": item.created_at,
            }
        )
    return [
        {
            "id": item.id,
            "note": redact_anonymous_identity(item.note, user, complaint),
            "submitted_at": item.submitted_at,
            "submitted_by": (
                None
                if (
                    not can_view_complainant_identity(user, complaint)
                    and item.submitter.id == complaint.created_by
                )
                else {"id": item.submitter.id, "name": item.submitter.name}
            ),
            "attachments": attachments_by_repair.get(item.id, []),
        }
        for item in submissions
    ]


def complaint_query():
    return select(Complaint).options(joinedload(Complaint.creator), joinedload(Complaint.assignee))


def get_visible_complaint_or_404(complaint_id: int, user: User, db: Session) -> Complaint:
    complaint = db.scalar(complaint_query().where(Complaint.id == complaint_id))
    if not complaint or not can_view_complaint(user, complaint):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return complaint


def timeline_event_payload(event: ComplaintEvent, complaint: Complaint, user: User) -> dict:
    hide_identity = not can_view_complainant_identity(user, complaint)
    is_complainant_event = hide_identity and event.actor_id == complaint.created_by
    return {
        "id": event.id,
        "event_type": event.event_type,
        "message": (
            "Anonymous student update recorded."
            if is_complainant_event
            else redact_anonymous_identity(event.message, user, complaint)
        ),
        "created_at": event.created_at,
        "actor": (
            None
            if is_complainant_event
            else {"id": event.actor.id, "name": event.actor.name}
            if event.actor
            else None
        ),
    }


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
    db.flush()
    db.add(ComplaintEvent(complaint_id=complaint.id, actor_id=current_user.id, event_type="submitted", message="Grievance submitted"))
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

    if "status" in data or "assigned_to" in data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the dedicated assignment and complaint workflow actions",
        )
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
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    if complaint.status in (ComplaintStatus.AwaitingVerification, ComplaintStatus.Resolved, ComplaintStatus.Rejected):
        raise HTTPException(status_code=409, detail="Return this complaint for repair before changing its assignee")
    staff = db.get(User, payload.staff_id)
    if not staff or staff.role != UserRole.staff or not staff.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignee must be an active staff user",
        )
    if complaint.assigned_to == staff.id:
        return complaint
    previous_assignee = db.get(User, complaint.assigned_to) if complaint.assigned_to else None
    was_assigned = complaint.assigned_to is not None
    complaint.assigned_to = staff.id
    if complaint.status == ComplaintStatus.Submitted:
        complaint.status = ComplaintStatus.UnderReview
    event_name = "reassigned" if was_assigned else "assigned"
    previous_text = f" from {previous_assignee.name}" if previous_assignee else ""
    add_event(
        db,
        complaint.id,
        _.id,
        event_name,
        f"Assigned{previous_text} to {staff.name}.",
        f"{event_name}:{uuid4()}",
    )
    notify_user(
        db,
        staff.id,
        complaint,
        "Grievance assigned" if not was_assigned else "Grievance reassigned",
        f"{complaint.title} has been assigned to you.",
    )
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
    old_status = complaint.status
    if current_user.role == UserRole.staff:
        if complaint.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Only the assigned staff member can update this complaint")
        if payload.status != ComplaintStatus.InProgress:
            raise HTTPException(
                status_code=400,
                detail="Staff cannot close complaints; submit repair evidence for student verification",
            )
        if old_status not in (ComplaintStatus.UnderReview, ComplaintStatus.InProgress):
            raise HTTPException(status_code=409, detail="This complaint is not ready to be started")
    else:
        allowed = {
            ComplaintStatus.Submitted: {ComplaintStatus.UnderReview, ComplaintStatus.Rejected},
            ComplaintStatus.UnderReview: {ComplaintStatus.InProgress, ComplaintStatus.Rejected},
            ComplaintStatus.InProgress: {ComplaintStatus.UnderReview, ComplaintStatus.Rejected},
        }
        if payload.status != old_status and payload.status not in allowed.get(old_status, set()):
            raise HTTPException(
                status_code=400,
                detail="Use student verification or the reason-required admin review action for this transition",
            )
    complaint.status = payload.status
    if old_status != payload.status:
        add_event(
            db,
            complaint.id,
            current_user.id,
            "status",
            f"Status changed from {old_status.value} to {payload.status.value}.",
        )
        if complaint.created_by:
            notify_user(
                db,
                complaint.created_by,
                complaint,
                "Grievance status updated",
                f"{complaint.title}: {payload.status.value}",
            )
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
    if current_user.role == UserRole.staff and complaint.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned staff member can update repair details")
    complaint.resolution_notes = payload.resolution_notes
    db.commit()
    db.refresh(complaint)
    return serialize_complaint_for_user(complaint, current_user)


@router.post("/{complaint_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_complaint_image(
    complaint_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    if current_user.role != UserRole.student or complaint.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the student who submitted this grievance can upload evidence")
    data = await file.read(MAX_IMAGE_BYTES + 1)
    verified_image(file, data)
    attachment = ComplaintAttachment(complaint_id=complaint.id, uploaded_by=current_user.id, filename=(file.filename or "evidence").replace("\\", "_").replace("/", "_")[:255], content_type=file.content_type, size_bytes=len(data), content=data)
    db.add(attachment)
    add_event(db, complaint.id, current_user.id, "attachment", "Initial complaint evidence uploaded.")
    db.commit()
    db.refresh(attachment)
    return {"id": attachment.id, "filename": attachment.filename, "content_type": attachment.content_type, "size_bytes": attachment.size_bytes, "created_at": attachment.created_at}

@router.get("/{complaint_id}/attachments")
def list_complaint_attachments(complaint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    rows = db.scalars(select(ComplaintAttachment).where(ComplaintAttachment.complaint_id == complaint_id).order_by(ComplaintAttachment.created_at.asc())).all()
    return [{"id": a.id, "filename": redact_anonymous_identity(a.filename, current_user, complaint), "content_type": a.content_type, "size_bytes": a.size_bytes, "created_at": a.created_at} for a in rows]

@router.get("/{complaint_id}/attachments/{attachment_id}/content")
def get_complaint_attachment(complaint_id: int, attachment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    item = db.get(ComplaintAttachment, attachment_id)
    if not item or item.complaint_id != complaint_id:
        raise HTTPException(status_code=404, detail="Image not found")
    filename = quote(
        redact_anonymous_identity(item.filename, current_user, complaint),
        safe="",
    )
    return Response(
        content=item.content,
        media_type=item.content_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{filename}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@router.post("/{complaint_id}/repairs", status_code=status.HTTP_201_CREATED)
async def submit_repair(
    complaint_id: int,
    note: str = Form(..., min_length=5, max_length=5000),
    request_key: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.staff)),
):
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned staff member can submit repair evidence")
    try:
        parsed_key = str(UUID(request_key))
    except ValueError as error:
        raise HTTPException(status_code=422, detail="A valid request key is required") from error

    prior = db.scalar(
        select(ComplaintRepairSubmission).where(
            ComplaintRepairSubmission.complaint_id == complaint.id,
            ComplaintRepairSubmission.request_key == parsed_key,
        )
    )
    if prior:
        return {"id": prior.id, "submitted_at": prior.submitted_at, "status": complaint.status}
    if complaint.status not in (ComplaintStatus.UnderReview, ComplaintStatus.InProgress):
        raise HTTPException(status_code=409, detail="This complaint is not ready for another repair attempt")
    if not complaint.created_by:
        raise HTTPException(status_code=409, detail="The complaint has no student who can verify its repair")
    clean_note = note.strip()
    if len(clean_note) < 5:
        raise HTTPException(status_code=422, detail="Enter a repair note of at least 5 characters")

    data = await file.read(MAX_IMAGE_BYTES + 1)
    verified_image(file, data)
    repair = ComplaintRepairSubmission(
        complaint_id=complaint.id,
        submitted_by=current_user.id,
        request_key=parsed_key,
        note=clean_note,
    )
    db.add(repair)
    db.flush()
    attachment = ComplaintAttachment(
        complaint_id=complaint.id,
        uploaded_by=current_user.id,
        repair_submission_id=repair.id,
        filename=(file.filename or "repair-evidence").replace("\\", "_").replace("/", "_")[:255],
        content_type=file.content_type,
        size_bytes=len(data),
        content=data,
    )
    db.add(attachment)
    complaint.status = ComplaintStatus.AwaitingVerification
    add_event(
        db,
        complaint.id,
        current_user.id,
        "repair_submitted",
        f"Repair attempt {repair.id} submitted by {current_user.name}. Note: {clean_note}",
        f"repair-submission:{repair.id}",
    )
    notify_user(
        db,
        complaint.created_by,
        complaint,
        "Repair ready for verification",
        f"{complaint.title} has a repair update for you to review.",
    )
    notify_admins(
        db,
        complaint,
        "Repair evidence submitted",
        f"Repair evidence was submitted for {complaint.title}.",
    )
    db.commit()
    db.refresh(repair)
    return {"id": repair.id, "submitted_at": repair.submitted_at, "status": complaint.status}


@router.get("/{complaint_id}/repairs")
def list_repair_submissions(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    return repair_history_payload(db, complaint, current_user)


@router.post("/{complaint_id}/verification")
def submit_student_verification(
    complaint_id: int,
    payload: RepairVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint or complaint.created_by != current_user.id:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.status != ComplaintStatus.AwaitingVerification:
        raise HTTPException(status_code=409, detail="This complaint is not awaiting student verification")
    assignee = db.get(User, complaint.assigned_to) if complaint.assigned_to else None
    if payload.action == "still_not_fixed":
        reason = (payload.reason or "").strip()
        if len(reason) < 5:
            raise HTTPException(status_code=422, detail="Explain what is still not fixed (at least 5 characters)")
        complaint.status = ComplaintStatus.InProgress
        add_event(
            db,
            complaint.id,
            current_user.id,
            "student_rejected_repair",
            f"Student {current_user.name} reported that the repair is incomplete: {reason}",
        )
        notify_user(
            db,
            complaint.assigned_to,
            complaint,
            "Further repair required",
            f"The student reported that {complaint.title} is still not fixed.",
        )
        notify_admins(
            db,
            complaint,
            "Repair reported incomplete",
            f"The student reported that {complaint.title} is still not fixed.",
        )
        result_message = "The complaint was returned to the assigned employee for further repair."
    else:
        complaint.status = ComplaintStatus.Resolved
        add_event(
            db,
            complaint.id,
            current_user.id,
            "student_approved_repair",
            f"Repair approved by student {current_user.name}.",
        )
        notify_user(
            db,
            complaint.assigned_to,
            complaint,
            "Repair approved",
            f"The student approved the repair for {complaint.title}.",
        )
        notify_admins(
            db,
            complaint,
            "Repair approved by student",
            f"The student approved the repair for {complaint.title}.",
        )
        result_message = "Repair approved. The complaint is complete."
    db.commit()
    return {"status": complaint.status, "message": result_message, "assigned_to": assignee.id if assignee else None}


def process_due_verification_notifications(db: Session) -> dict[str, int]:
    settings = get_settings()
    reminders_sent = 0
    overdue_flags = 0
    now = datetime.now(timezone.utc)
    complaints = db.scalars(
        select(Complaint)
        .where(Complaint.status == ComplaintStatus.AwaitingVerification)
        .order_by(Complaint.id.asc())
        .with_for_update()
    ).all()
    reminder_interval = timedelta(hours=settings.verification_reminder_hours)
    review_interval = timedelta(hours=settings.verification_review_hours)
    for complaint in complaints:
        repair = db.scalar(
            select(ComplaintRepairSubmission)
            .where(ComplaintRepairSubmission.complaint_id == complaint.id)
            .order_by(ComplaintRepairSubmission.submitted_at.desc(), ComplaintRepairSubmission.id.desc())
            .limit(1)
        )
        if not repair:
            continue
        elapsed = now - utc_datetime(repair.submitted_at)
        if elapsed >= reminder_interval and complaint.created_by:
            reminder_number = int(elapsed.total_seconds() // reminder_interval.total_seconds())
            reminder_key = f"verification-reminder:{repair.id}:{reminder_number}"
            if add_event(
                db,
                complaint.id,
                None,
                "verification_reminder",
                f"Verification reminder {reminder_number} sent to the student for repair attempt {repair.id}.",
                reminder_key,
            ):
                notify_user(
                    db,
                    complaint.created_by,
                    complaint,
                    "Reminder: verify the repair",
                    f"Please review the repair update for {complaint.title}.",
                )
                reminders_sent += 1
        if elapsed >= review_interval:
            overdue_key = f"verification-overdue:{repair.id}"
            if add_event(
                db,
                complaint.id,
                None,
                "verification_overdue",
                f"Repair attempt {repair.id} is overdue for student verification and needs administrator review.",
                overdue_key,
            ):
                notify_admins(
                    db,
                    complaint,
                    "Verification overdue - admin review needed",
                    f"{complaint.title} has passed the configured verification review interval.",
                )
                overdue_flags += 1
    db.commit()
    return {"reminders_sent": reminders_sent, "overdue_flags": overdue_flags}


@router.post("/admin/verification/process-reminders")
def process_verification_reminders(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return process_due_verification_notifications(db)


@router.get("/admin/verification")
def admin_verification_queue(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    settings = get_settings()
    complaints = db.scalars(
        complaint_query()
        .where(Complaint.status == ComplaintStatus.AwaitingVerification)
        .order_by(Complaint.updated_at.asc())
    ).all()
    now = datetime.now(timezone.utc)
    result = []
    for complaint in complaints:
        repairs = repair_history_payload(db, complaint, _)
        latest = repairs[-1] if repairs else None
        elapsed_hours = (
            (now - utc_datetime(latest["submitted_at"])).total_seconds() / 3600
            if latest
            else 0
        )
        timeline = db.scalars(
            select(ComplaintEvent)
            .options(joinedload(ComplaintEvent.actor))
            .where(ComplaintEvent.complaint_id == complaint.id)
            .order_by(ComplaintEvent.created_at.asc(), ComplaintEvent.id.asc())
        ).unique().all()
        reminder_history = [
            {
                "event_type": event.event_type,
                "message": event.message,
                "created_at": event.created_at,
                "actor": {"id": event.actor.id, "name": event.actor.name} if event.actor else None,
            }
            for event in timeline
            if event.event_type
            in {"verification_reminder", "verification_overdue", "admin_review", "admin_nonresponse_closure"}
        ]
        result.append(
            {
                "id": complaint.id,
                "title": complaint.title,
                "description": complaint.description,
                "status": complaint.status,
                "created_at": complaint.created_at,
                "creator": {"id": complaint.creator.id, "name": complaint.creator.name} if complaint.creator else None,
                "assignee": {"id": complaint.assignee.id, "name": complaint.assignee.name} if complaint.assignee else None,
                "assigned_to": complaint.assigned_to,
                "latest_repair": latest,
                "repair_history": repairs,
                "overdue": elapsed_hours >= settings.verification_review_hours,
                "age_hours": round(elapsed_hours, 1),
                "review_interval_hours": settings.verification_review_hours,
                "reminder_interval_hours": settings.verification_reminder_hours,
                "reminder_history": reminder_history,
                "timeline": [
                    {
                        "id": event.id,
                        "event_type": event.event_type,
                        "message": event.message,
                        "created_at": event.created_at,
                        "actor": {"id": event.actor.id, "name": event.actor.name} if event.actor else None,
                    }
                    for event in timeline
                ],
            }
        )
    return result


@router.post("/admin/verification/{complaint_id}/review")
def record_admin_verification_review(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint or complaint.status != ComplaintStatus.AwaitingVerification:
        raise HTTPException(status_code=409, detail="Complaint is not awaiting verification")
    review_date = datetime.now(timezone.utc).date().isoformat()
    recorded = add_event(
        db,
        complaint.id,
        current_user.id,
        "admin_review",
        f"Administrator {current_user.name} reviewed the complaint after repair evidence was submitted.",
        f"admin-review:{complaint.id}:{current_user.id}:{review_date}",
    )
    if recorded:
        notify_user(
            db,
            complaint.created_by,
            complaint,
            "Administrator reviewed pending verification",
            f"An administrator reviewed the repair evidence for {complaint.title}.",
        )
        notify_user(
            db,
            complaint.assigned_to,
            complaint,
            "Administrator reviewed repair evidence",
            f"An administrator reviewed the repair evidence for {complaint.title}.",
        )
        notify_admins(
            db,
            complaint,
            "Verification complaint reviewed",
            f"{complaint.title} was reviewed by an administrator.",
        )
    db.commit()
    return {"recorded": recorded}


@router.post("/admin/verification/{complaint_id}/remind")
def send_verification_reminder(
    complaint_id: int,
    payload: ReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint or complaint.status != ComplaintStatus.AwaitingVerification:
        raise HTTPException(status_code=409, detail="Complaint is not awaiting verification")
    repair = db.scalar(
        select(ComplaintRepairSubmission)
        .where(ComplaintRepairSubmission.complaint_id == complaint.id)
        .order_by(ComplaintRepairSubmission.submitted_at.desc(), ComplaintRepairSubmission.id.desc())
        .limit(1)
    )
    if not repair or not complaint.created_by:
        raise HTTPException(status_code=409, detail="No student verification request is available")
    try:
        request_key = str(UUID(payload.request_key))
    except ValueError as error:
        raise HTTPException(status_code=422, detail="A valid request key is required") from error
    dedupe_key = f"manual-reminder:{repair.id}:{request_key}"
    if add_event(
        db,
        complaint.id,
        current_user.id,
        "verification_reminder",
        f"Administrator {current_user.name} sent a verification reminder for repair attempt {repair.id}.",
        dedupe_key,
    ):
        notify_user(
            db,
            complaint.created_by,
            complaint,
            "Reminder: verify the repair",
            f"An administrator asks you to review the repair update for {complaint.title}.",
        )
        db.commit()
        return {"sent": True}
    db.rollback()
    return {"sent": False, "message": "This reminder request was already processed"}


@router.post("/admin/verification/{complaint_id}/return")
def admin_return_for_repair(
    complaint_id: int,
    payload: AdminRepairReturnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint or complaint.status != ComplaintStatus.AwaitingVerification:
        raise HTTPException(status_code=409, detail="Complaint is not awaiting verification")
    assignee = db.get(User, complaint.assigned_to) if complaint.assigned_to else None
    if not assignee or assignee.role != UserRole.staff:
        raise HTTPException(status_code=409, detail="Assign a staff member before returning this complaint for repair")
    reason = payload.reason.strip()
    complaint.status = ComplaintStatus.InProgress
    add_event(
        db,
        complaint.id,
        current_user.id,
        "admin_returned_for_repair",
        f"Administrator {current_user.name} returned the complaint for further repair: {reason}",
    )
    notify_user(db, assignee.id, complaint, "Further repair required", f"An administrator returned {complaint.title} for more work.")
    notify_user(db, complaint.created_by, complaint, "Further repair requested", f"An administrator requested another repair for {complaint.title}.")
    notify_admins(db, complaint, "Complaint returned for repair", f"{complaint.title} was returned for further repair.")
    db.commit()
    return {"status": complaint.status}


@router.post("/admin/verification/{complaint_id}/close")
def admin_close_after_nonresponse(
    complaint_id: int,
    payload: AdminNonResponseClosureRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    complaint = db.scalar(
        select(Complaint).where(Complaint.id == complaint_id).with_for_update()
    )
    if not complaint or complaint.status != ComplaintStatus.AwaitingVerification:
        raise HTTPException(status_code=409, detail="Complaint is not awaiting verification")
    if not payload.confirmed:
        raise HTTPException(status_code=400, detail="Explicit confirmation is required")
    reason = payload.reason.strip()
    if len(reason) < 10:
        raise HTTPException(status_code=422, detail="Provide a closure reason of at least 10 characters")
    complaint.status = ComplaintStatus.Resolved
    add_event(
        db,
        complaint.id,
        current_user.id,
        "admin_nonresponse_closure",
        f"Administrator {current_user.name} (user {current_user.id}) administratively closed this complaint after student non-response. Reason: {reason}",
    )
    notify_user(
        db,
        complaint.created_by,
        complaint,
        "Complaint administratively closed",
        f"An administrator closed {complaint.title} after review. This was not recorded as student approval.",
    )
    notify_user(db, complaint.assigned_to, complaint, "Complaint closed by administrator", f"{complaint.title} was administratively closed.")
    notify_admins(db, complaint, "Complaint administratively closed", f"{complaint.title} was closed after student non-response.")
    db.commit()
    return {"status": complaint.status, "message": "Complaint administratively closed after review"}


@router.get("/{complaint_id}/timeline")
def complaint_timeline(complaint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    complaint = get_visible_complaint_or_404(complaint_id, current_user, db)
    rows = db.scalars(
        select(ComplaintEvent)
        .options(joinedload(ComplaintEvent.actor))
        .where(ComplaintEvent.complaint_id == complaint_id)
        .order_by(ComplaintEvent.created_at.asc(), ComplaintEvent.id.asc())
    ).unique().all()
    return [
        timeline_event_payload(event, complaint, current_user)
        for event in rows
    ]
