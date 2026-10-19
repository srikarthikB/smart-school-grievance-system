from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.deps import get_current_user
from app.api.routes import auth, users
from app.core import security
from app.models import Complaint, User
from app.models.enums import ComplaintCategory, ComplaintPriority, ComplaintStatus, UserRole
from app.schemas.auth import LoginRequest
from test_support import db_session


TEST_SETTINGS = SimpleNamespace(
    secret_key="isolated-user-security-test-signing-key",
    access_token_expire_minutes=15,
)


def _create_user(db_session, name, email, role, **kwargs):
    user = User(
        name=name,
        email=email,
        password_hash=kwargs.pop("password_hash", "test-only-not-a-real-password"),
        role=role,
        **kwargs,
    )
    db_session.add(user)
    db_session.flush()
    return user


def _token_for(user):
    with patch.object(security, "get_settings", return_value=TEST_SETTINGS):
        return security.create_access_token(
            str(user.id),
            {"role": user.role.value, "tv": user.token_version},
        )


def test_logout_revokes_a_previously_issued_token(db_session):
    user = _create_user(db_session, "Student", "logout.student@example.com", UserRole.student)
    db_session.commit()
    token = _token_for(user)

    auth.logout(user, db_session)

    with patch.object(security, "get_settings", return_value=TEST_SETTINGS):
        with pytest.raises(HTTPException) as raised:
            get_current_user(token, db_session)

    assert raised.value.status_code == 401
    assert raised.value.detail == "Token has been revoked"


def test_authentication_rejects_inactive_users(db_session):
    user = _create_user(
        db_session,
        "Inactive Student",
        "inactive.auth@example.com",
        UserRole.student,
        is_active=False,
    )
    db_session.commit()
    token = _token_for(user)

    with patch.object(security, "get_settings", return_value=TEST_SETTINGS):
        with pytest.raises(HTTPException) as raised:
            get_current_user(token, db_session)

    assert raised.value.status_code == 401
    assert raised.value.detail == "Could not validate credentials"


def test_login_rejects_inactive_users(db_session):
    password = "valid-test-password"
    user = _create_user(
        db_session,
        "Inactive Student",
        "inactive.login@example.com",
        UserRole.student,
        is_active=False,
        password_hash=security.hash_password(password),
    )
    db_session.commit()

    with pytest.raises(HTTPException) as raised:
        auth.login(LoginRequest(email=user.email, password=password), db_session)

    assert raised.value.status_code == 401
    assert raised.value.detail == "Invalid email or password"


def test_deactivation_revokes_tokens_and_preserves_complaint_history(db_session):
    admin = _create_user(db_session, "Admin", "security.admin@example.com", UserRole.admin)
    student = _create_user(db_session, "Student", "history.student@example.com", UserRole.student)
    db_session.commit()
    starting_token_version = student.token_version
    complaint = Complaint(
        title="Historical complaint",
        description="This record must remain after account deactivation.",
        category=ComplaintCategory.Infrastructure,
        priority=ComplaintPriority.Medium,
        status=ComplaintStatus.InProgress,
        is_anonymous=False,
        created_by=student.id,
    )
    db_session.add(complaint)
    db_session.commit()
    complaint_id = complaint.id

    users.deactivate_user(student.id, db_session, admin)

    db_session.expire_all()
    deactivated = db_session.get(User, student.id)
    historical_complaint = db_session.scalar(
        select(Complaint).where(Complaint.id == complaint_id)
    )
    assert deactivated is not None
    assert deactivated.is_active is False
    assert deactivated.token_version == starting_token_version + 1
    assert historical_complaint is not None
    assert historical_complaint.created_by == student.id
