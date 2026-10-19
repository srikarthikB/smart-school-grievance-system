import pytest

from app.models.complaint import Complaint
from app.models.enums import ComplaintCategory, ComplaintStatus, UserRole
from app.models.user import User
from app.services.complaint_visibility import (
    redact_anonymous_identity,
    serialize_complaint_for_user,
)
from test_support import db_session


PRIVATE_NAME = "Zeraphine Quillmark"
PRIVATE_EMAIL = "zeraphine.quillmark@example.com"
DISTINCTIVE_PHRASE = "the cobalt observatory"


def _create_user(
    db_session,
    name: str,
    email: str,
    role: UserRole,
) -> User:
    user = User(
        name=name,
        email=email,
        password_hash="test-only-not-a-real-password",
        role=role,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def anonymous_complaint(db_session):
    student = _create_user(
        db_session,
        PRIVATE_NAME,
        PRIVATE_EMAIL,
        UserRole.student,
    )
    staff = _create_user(
        db_session,
        "Assigned Staff",
        "assigned.staff@example.com",
        UserRole.staff,
    )
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
    return student, staff, complaint


def test_anonymous_complaint_details_hide_identity_from_assigned_staff(
    anonymous_complaint,
):
    _, staff, complaint = anonymous_complaint

    response = serialize_complaint_for_user(complaint, staff)
    payload = response.model_dump(mode="json")

    assert payload["created_by"] is None
    assert payload["creator"] is None
    assert PRIVATE_NAME not in str(payload)
    assert PRIVATE_EMAIL not in str(payload)
    assert DISTINCTIVE_PHRASE in payload["description"]
    assert "[anonymous student]" in payload["title"]
    assert "[anonymous student]" in payload["description"]
    assert "[anonymous student]" in payload["resolution_notes"]


@pytest.mark.parametrize(
    ("text", "preserved_text"),
    [
        (
            f"Timeline update: {PRIVATE_NAME} reported {DISTINCTIVE_PHRASE}.",
            DISTINCTIVE_PHRASE,
        ),
        (
            f"Repair note from {PRIVATE_NAME}: {DISTINCTIVE_PHRASE}.",
            DISTINCTIVE_PHRASE,
        ),
        (f"{PRIVATE_NAME}-repair-evidence.png", "-repair-evidence.png"),
        (
            f"Feedback from {PRIVATE_NAME}: {DISTINCTIVE_PHRASE}.",
            DISTINCTIVE_PHRASE,
        ),
        (
            f"Notification for {PRIVATE_NAME}: {DISTINCTIVE_PHRASE}.",
            DISTINCTIVE_PHRASE,
        ),
    ],
    ids=(
        "timeline-message",
        "repair-note",
        "attachment-filename",
        "feedback-comment",
        "notification-text",
    ),
)
def test_anonymous_complaint_text_redaction_removes_distinctive_name(
    anonymous_complaint,
    text: str,
    preserved_text: str,
):
    _, staff, complaint = anonymous_complaint

    redacted = redact_anonymous_identity(text, staff, complaint)

    assert PRIVATE_NAME not in redacted
    assert "[anonymous student]" in redacted
    assert preserved_text in redacted


def test_anonymous_complaint_text_redaction_removes_creator_email(
    anonymous_complaint,
):
    _, staff, complaint = anonymous_complaint
    text = f"Contact the student at {PRIVATE_EMAIL} about {DISTINCTIVE_PHRASE}."

    redacted = redact_anonymous_identity(text, staff, complaint)

    assert redacted == f"Contact the student at [anonymous student] about {DISTINCTIVE_PHRASE}."


@pytest.mark.parametrize("role", [UserRole.student, UserRole.admin])
def test_complaint_owner_and_admin_retain_anonymous_identity(
    db_session,
    anonymous_complaint,
    role: UserRole,
):
    student, _, complaint = anonymous_complaint
    viewer = (
        student
        if role == UserRole.student
        else _create_user(
            db_session,
            "Review Administrator",
            "review.admin@example.com",
            UserRole.admin,
        )
    )

    response = serialize_complaint_for_user(complaint, viewer)
    payload = response.model_dump(mode="json")

    assert payload["created_by"] == student.id
    assert payload["creator"]["name"] == PRIVATE_NAME
    assert payload["creator"]["email"] == PRIVATE_EMAIL
    assert PRIVATE_NAME in payload["description"]
    assert DISTINCTIVE_PHRASE in payload["description"]


def test_non_anonymous_complaint_keeps_identity_visible_to_assigned_staff(
    db_session,
):
    student = _create_user(
        db_session,
        PRIVATE_NAME,
        PRIVATE_EMAIL,
        UserRole.student,
    )
    staff = _create_user(
        db_session,
        "Assigned Staff",
        "assigned.staff@example.com",
        UserRole.staff,
    )
    complaint = Complaint(
        title=f"{PRIVATE_NAME} reported {DISTINCTIVE_PHRASE}",
        description=f"{PRIVATE_NAME} described {DISTINCTIVE_PHRASE}.",
        category=ComplaintCategory.Infrastructure,
        status=ComplaintStatus.Resolved,
        is_anonymous=False,
        created_by=student.id,
        assigned_to=staff.id,
    )
    db_session.add(complaint)
    db_session.flush()

    payload = serialize_complaint_for_user(complaint, staff).model_dump(mode="json")

    assert payload["created_by"] == student.id
    assert payload["creator"]["name"] == PRIVATE_NAME
    assert payload["creator"]["email"] == PRIVATE_EMAIL
    assert PRIVATE_NAME in payload["description"]
    assert DISTINCTIVE_PHRASE in payload["description"]
