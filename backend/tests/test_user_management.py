import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from pydantic import ValidationError

from app.api.deps import get_current_user, require_roles
from app.api.routes import auth, users
from app.core.security import verify_password
from app.db.base import Base
from app.models.enums import Department, UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserRead


class UserManagementTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine, tables=[User.__table__])
        self.session = Session(self.engine)
        self.admin = User(
            name="Existing Admin",
            email="Admin@example.com",
            password_hash="not-used",
            role=UserRole.admin,
            department=Department.Administration,
        )
        self.session.add(self.admin)
        self.session.commit()
        self.session.refresh(self.admin)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_admin_can_create_user_with_hashed_password_and_safe_response(self):
        payload = UserCreate.model_validate({
            "name": "New Staff Member",
            "email": "New.Staff@example.com",
            "password": "a-secure-password",
            "role": "staff",
            "department": "Academic",
        })
        created = users.create_user(payload, self.session, self.admin)
        response = UserRead.model_validate(created).model_dump()

        self.assertEqual(created.email, "new.staff@example.com")
        self.assertTrue(verify_password("a-secure-password", created.password_hash))
        self.assertNotEqual(created.password_hash, "a-secure-password")
        self.assertNotIn("password", response)
        self.assertNotIn("password_hash", response)

    def test_create_rejects_case_insensitive_duplicate_email(self):
        payload = UserCreate.model_validate({
            "name": "Duplicate",
            "email": "ADMIN@EXAMPLE.COM",
            "password": "a-secure-password",
            "role": "student",
            "department": "Academic",
        })
        with self.assertRaises(HTTPException) as raised:
            users.create_user(payload, self.session, self.admin)

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(raised.exception.detail, "Email already registered")

    def test_list_users_returns_public_fields_only(self):
        users.create_user(
            UserCreate.model_validate({
                "name": "Listed Staff",
                "email": "listed.staff@example.com",
                "password": "a-secure-password",
                "role": "staff",
                "department": "Academic",
            }),
            self.session,
            self.admin,
        )
        listed = users.list_users(self.session, self.admin)
        response_users = [UserRead.model_validate(user).model_dump() for user in listed]

        self.assertTrue(any(item["email"] == "listed.staff@example.com" for item in response_users))
        self.assertTrue(all("password_hash" not in item and "password" not in item for item in response_users))

    def test_public_registration_rejects_non_student_roles(self):
        payload = UserCreate.model_validate({
            "name": "Attempted Admin",
            "email": "attempted.admin@example.com",
            "password": "a-secure-password",
            "role": "admin",
        })
        with self.assertRaises(HTTPException) as raised:
            auth.register(payload, self.session)

        self.assertEqual(raised.exception.status_code, 403)

    def test_public_student_registration_stays_available_and_rejects_duplicates(self):
        payload = UserCreate.model_validate({
            "name": "Public Student",
            "email": "Public.Student@example.com",
            "password": "a-secure-password",
            "role": "student",
            "department": "Academic",
        })
        test_settings = SimpleNamespace(
            secret_key="isolated-user-management-test-signing-key",
            access_token_expire_minutes=15,
        )
        with patch("app.core.security.get_settings", return_value=test_settings):
            result = auth.register(payload, self.session)
        self.assertTrue(result.access_token)
        self.assertEqual(result.user.role, UserRole.student)
        self.assertFalse(hasattr(result.user, "password_hash"))
        created = self.session.scalar(select(User).where(User.email == "public.student@example.com"))
        self.assertTrue(verify_password(payload.password, created.password_hash))

        duplicate = UserCreate.model_validate({
            "name": "Duplicate Student",
            "email": "PUBLIC.STUDENT@EXAMPLE.COM",
            "password": "another-secure-password",
            "role": "student",
        })
        with self.assertRaises(HTTPException) as raised:
            auth.register(duplicate, self.session)
        self.assertEqual(raised.exception.status_code, 409)

    def test_invalid_role_is_rejected_by_schema(self):
        with self.assertRaises(ValidationError) as raised:
            UserCreate.model_validate({
                "name": "Invalid Role",
                "email": "invalid.role@example.com",
                "password": "a-secure-password",
                "role": "teacher",
            })
        self.assertIn(("role",), [issue["loc"] for issue in raised.exception.errors()])

    def test_short_new_password_is_rejected_by_schema(self):
        with self.assertRaises(ValidationError) as raised:
            UserCreate.model_validate({
                "name": "Short Password",
                "email": "short.password@example.com",
                "password": "short",
                "role": "student",
            })
        self.assertIn(("password",), [issue["loc"] for issue in raised.exception.errors()])

    def test_admin_role_dependency_rejects_students_and_staff(self):
        admin_check = require_roles(UserRole.admin)
        self.assertIs(admin_check(self.admin), self.admin)

        for role in (UserRole.student, UserRole.staff):
            with self.subTest(role=role):
                user = User(
                    name=f"Test {role.value}",
                    email=f"{role.value}@example.com",
                    password_hash="not-used",
                    role=role,
                )
                with self.assertRaises(HTTPException) as raised:
                    admin_check(user)
                self.assertEqual(raised.exception.status_code, 403)

    def test_all_user_management_routes_have_role_guard(self):
        for route in users.router.routes:
            dependencies = route.dependant.dependencies
            guard = next((dependency for dependency in dependencies if dependency.name in ("_", "current_user")), None)
            self.assertIsNotNone(guard, route.path)
            self.assertEqual(getattr(guard.call, "__name__", None), "checker", route.path)
            self.assertIn(get_current_user, [dependency.call for dependency in guard.dependencies])

# Blocked pending a separate product decision: the consolidated application has
# no bootstrap_admin module, so these reference cases are intentionally not ported:
# - test_bootstrap_admin_only_succeeds_when_no_admin_exists
# - test_bootstrap_requires_long_password


if __name__ == "__main__":
    unittest.main()
