from collections.abc import Callable, Iterator
from urllib.parse import unquote

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.routes import complaints, feedback, notifications
from app.db.session import get_db
from app.models.complaint import Complaint
from app.models.enums import ComplaintCategory, ComplaintStatus, UserRole
from app.models.feedback import Feedback
from app.models.records import (
    ComplaintAttachment,
    ComplaintEvent,
    ComplaintRepairSubmission,
    Notification,
)
from app.models.user import User
from test_support import db_session


PRIVATE_NAME = "Zeraphine Quillmark"
PRIVATE_EMAIL = "zeraphine.quillmark@example.com"
DISTINCTIVE_PHRASE = "the cobalt observatory"


@pytest.fixture
def privacy_api(
    db_session: Session,
) -> Iterator[tuple[TestClient, Callable[[User], None]]]:
    app = FastAPI()
    app.include_router(complaints.router, prefix="/api/complaints")
    app.include_router(feedback.router, prefix="/api/feedback")
    app.include_router(notifications.router, prefix="/api/notifications")

    principal: dict[str, User | None] = {"user": None}

    def override_get_db() -> Iterator[Session]:
        yield db_session

    def authenticate_as(user: User) -> None:
        principal["user"] = user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: principal["user"]

    try:
        with TestClient(app) as client:
            yield client, authenticate_as
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def anonymous_complaint_records(db_session: Session) -> dict[str, object]:
    student = User(
        name=PRIVATE_NAME,
        email=PRIVATE_EMAIL,
        password_hash="test-only-not-a-real-password",
        role=UserRole.student,
    )
    staff = User(
        name="Assigned Staff",
        email="assigned.staff@example.com",
        password_hash="test-only-not-a-real-password",
        role=UserRole.staff,
    )
    admin = User(
        name="Review Administrator",
        email="review.admin@example.com",
        password_hash="test-only-not-a-real-password",
        role=UserRole.admin,
    )
    db_session.add_all([student, staff, admin])
    db_session.flush()

    complaint = Complaint(
        title=f"{PRIVATE_NAME} reported {DISTINCTIVE_PHRASE}",
        description=f"{PRIVATE_NAME} described {DISTINCTIVE_PHRASE}.",
        category=ComplaintCategory.Infrastructure,
        status=ComplaintStatus.Resolved,
        is_anonymous=True,
        created_by=student.id,
        assigned_to=staff.id,
        resolution_notes=f"{PRIVATE_NAME} confirmed {DISTINCTIVE_PHRASE}.",
    )
    db_session.add(complaint)
    db_session.flush()

    event = ComplaintEvent(
        complaint_id=complaint.id,
        actor_id=student.id,
        event_type="student_update",
        message=f"{PRIVATE_NAME} reported {DISTINCTIVE_PHRASE}.",
    )
    repair = ComplaintRepairSubmission(
        complaint_id=complaint.id,
        submitted_by=student.id,
        request_key="privacy-repair-request-001",
        note=f"{PRIVATE_NAME} submitted evidence about {DISTINCTIVE_PHRASE}.",
    )
    feedback_row = Feedback(
        complaint_id=complaint.id,
        rating=5,
        comment=f"{PRIVATE_NAME} confirmed {DISTINCTIVE_PHRASE}.",
    )
    db_session.add_all([event, repair, feedback_row])
    db_session.flush()

    attachment = ComplaintAttachment(
        complaint_id=complaint.id,
        uploaded_by=student.id,
        repair_submission_id=repair.id,
        filename=f"{PRIVATE_NAME}-repair-evidence.png",
        content_type="image/png",
        size_bytes=8,
        content=b"\x89PNG\r\n\x1a\n",
    )
    staff_notification = Notification(
        user_id=staff.id,
        complaint_id=complaint.id,
        title=f"Update from {PRIVATE_NAME}",
        message=f"{PRIVATE_NAME} mentioned {DISTINCTIVE_PHRASE}.",
    )
    admin_notification = Notification(
        user_id=admin.id,
        complaint_id=complaint.id,
        title=f"Admin review: {PRIVATE_NAME}",
        message=f"{PRIVATE_NAME} reported {DISTINCTIVE_PHRASE}.",
    )
    db_session.add_all([attachment, staff_notification, admin_notification])
    db_session.flush()

    return {
        "student": student,
        "staff": staff,
        "admin": admin,
        "complaint": complaint,
        "event": event,
        "repair": repair,
        "attachment": attachment,
        "staff_notification": staff_notification,
        "admin_notification": admin_notification,
    }


def _as_user(privacy_api, user: User) -> TestClient:
    client, authenticate_as = privacy_api
    authenticate_as(user)
    return client


def test_anonymous_complaint_detail_redacts_for_staff_but_not_owner_or_admin(
    privacy_api,
    anonymous_complaint_records,
):
    records = anonymous_complaint_records
    complaint_id = records["complaint"].id

    staff_response = _as_user(privacy_api, records["staff"]).get(
        f"/api/complaints/{complaint_id}"
    )
    owner_response = _as_user(privacy_api, records["student"]).get(
        f"/api/complaints/{complaint_id}"
    )
    admin_response = _as_user(privacy_api, records["admin"]).get(
        f"/api/complaints/{complaint_id}"
    )

    assert staff_response.status_code == 200
    staff_payload = staff_response.json()
    assert staff_payload["created_by"] is None
    assert staff_payload["creator"] is None
    assert PRIVATE_NAME not in str(staff_payload)
    assert PRIVATE_EMAIL not in str(staff_payload)
    assert DISTINCTIVE_PHRASE in staff_payload["description"]

    for response in (owner_response, admin_response):
        assert response.status_code == 200
        payload = response.json()
        assert payload["created_by"] == records["student"].id
        assert payload["creator"]["name"] == PRIVATE_NAME
        assert payload["creator"]["email"] == PRIVATE_EMAIL


def test_anonymous_timeline_hides_complainant_actor_from_staff(
    privacy_api,
    anonymous_complaint_records,
):
    records = anonymous_complaint_records
    path = f"/api/complaints/{records['complaint'].id}/timeline"

    staff_response = _as_user(privacy_api, records["staff"]).get(path)
    owner_response = _as_user(privacy_api, records["student"]).get(path)

    assert staff_response.status_code == 200
    staff_event = next(
        item for item in staff_response.json()
        if item["id"] == records["event"].id
    )
    assert staff_event["actor"] is None
    assert staff_event["message"] == "Anonymous student update recorded."
    assert PRIVATE_NAME not in str(staff_event)
    assert PRIVATE_EMAIL not in str(staff_event)

    owner_event = next(
        item for item in owner_response.json()
        if item["id"] == records["event"].id
    )
    assert owner_event["actor"]["name"] == PRIVATE_NAME
    assert PRIVATE_NAME in owner_event["message"]


def test_anonymous_repair_history_and_attachment_responses_redact_identity(
    privacy_api,
    anonymous_complaint_records,
):
    records = anonymous_complaint_records
    complaint_id = records["complaint"].id
    client = _as_user(privacy_api, records["staff"])

    history_response = client.get(f"/api/complaints/{complaint_id}/repairs")
    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 1
    assert PRIVATE_NAME not in str(history)
    assert PRIVATE_EMAIL not in str(history)
    assert history[0]["submitted_by"] is None
    assert DISTINCTIVE_PHRASE in history[0]["note"]
    assert "[anonymous student]" in history[0]["note"]
    assert PRIVATE_NAME not in history[0]["attachments"][0]["filename"]
    assert "[anonymous student]" in history[0]["attachments"][0]["filename"]

    attachments_response = client.get(
        f"/api/complaints/{complaint_id}/attachments"
    )
    assert attachments_response.status_code == 200
    attachments = attachments_response.json()
    assert PRIVATE_NAME not in str(attachments)
    assert PRIVATE_EMAIL not in str(attachments)
    assert "[anonymous student]" in attachments[0]["filename"]

    content_response = client.get(
        f"/api/complaints/{complaint_id}/attachments/"
        f"{records['attachment'].id}/content"
    )
    assert content_response.status_code == 200
    content_disposition = unquote(content_response.headers["content-disposition"])
    assert PRIVATE_NAME not in content_disposition
    assert PRIVATE_EMAIL not in content_disposition
    assert "[anonymous student]" in content_disposition

    owner_history = _as_user(privacy_api, records["student"]).get(
        f"/api/complaints/{complaint_id}/repairs"
    )
    assert owner_history.status_code == 200
    assert owner_history.json()[0]["submitted_by"]["name"] == PRIVATE_NAME
    assert PRIVATE_NAME in owner_history.json()[0]["attachments"][0]["filename"]

    owner_content = _as_user(privacy_api, records["student"]).get(
        f"/api/complaints/{complaint_id}/attachments/"
        f"{records['attachment'].id}/content"
    )
    assert owner_content.status_code == 200
    assert PRIVATE_NAME in unquote(owner_content.headers["content-disposition"])


def test_feedback_and_notifications_are_redacted_and_scoped_to_user(
    privacy_api,
    anonymous_complaint_records,
):
    records = anonymous_complaint_records
    complaint_id = records["complaint"].id

    staff = _as_user(privacy_api, records["staff"])
    feedback_response = staff.get(f"/api/feedback/{complaint_id}")
    notifications_response = staff.get("/api/notifications/mine")

    assert feedback_response.status_code == 200
    assert PRIVATE_NAME not in feedback_response.json()["comment"]
    assert PRIVATE_EMAIL not in feedback_response.json()["comment"]
    assert "[anonymous student]" in feedback_response.json()["comment"]
    assert DISTINCTIVE_PHRASE in feedback_response.json()["comment"]

    assert notifications_response.status_code == 200
    notifications_payload = notifications_response.json()
    assert len(notifications_payload) == 1
    assert notifications_payload[0]["id"] == records["staff_notification"].id
    assert PRIVATE_NAME not in str(notifications_payload)
    assert PRIVATE_EMAIL not in str(notifications_payload)
    assert "[anonymous student]" in notifications_payload[0]["title"]
    assert "[anonymous student]" in notifications_payload[0]["message"]
    assert DISTINCTIVE_PHRASE in notifications_payload[0]["message"]

    admin = _as_user(privacy_api, records["admin"])
    admin_feedback = admin.get(f"/api/feedback/{complaint_id}")
    admin_notifications = admin.get("/api/notifications/mine")
    owner_feedback = _as_user(privacy_api, records["student"]).get(
        f"/api/feedback/{complaint_id}"
    )
    assert admin_feedback.status_code == 200
    assert PRIVATE_NAME in admin_feedback.json()["comment"]
    assert owner_feedback.status_code == 200
    assert PRIVATE_NAME in owner_feedback.json()["comment"]
    assert admin_notifications.status_code == 200
    assert len(admin_notifications.json()) == 1
    assert PRIVATE_NAME in admin_notifications.json()[0]["message"]
