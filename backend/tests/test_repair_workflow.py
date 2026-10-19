import asyncio
from datetime import timedelta
from io import BytesIO
from types import SimpleNamespace
import unittest
from uuid import uuid4
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from starlette.datastructures import Headers

from app.api.routes import complaints as complaint_routes
from app.api.deps import get_current_user
from app.db.base import Base
from app.models.enums import ComplaintCategory, ComplaintPriority, ComplaintStatus, UserRole
from app.models import (
    Complaint,
    ComplaintAttachment,
    ComplaintEvent,
    ComplaintRepairSubmission,
    Notification,
    User,
)
from app.schemas.complaint import AssignComplaintRequest, ComplaintCreate, StatusUpdateRequest
from app.schemas.repair import (
    AdminNonResponseClosureRequest,
    AdminRepairReturnRequest,
    RepairVerificationRequest,
)


PNG_BYTES = b"\x89PNG\r\n\x1a\n"


class RepairWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.student = self.make_user("Student", "student@example.com", UserRole.student)
        self.other_student = self.make_user("Other Student", "other@example.com", UserRole.student)
        self.staff = self.make_user("Staff Member", "staff@example.com", UserRole.staff)
        self.other_staff = self.make_user("Other Staff", "other-staff@example.com", UserRole.staff)
        self.admin = self.make_user("Administrator", "admin@example.com", UserRole.admin)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def make_user(self, name, email, role):
        user = User(name=name, email=email, password_hash="unused-test-hash", role=role)
        self.db.add(user)
        self.db.flush()
        return user

    def make_complaint(self, status=ComplaintStatus.InProgress, assignee=None, owner=None, unassigned=False):
        complaint = Complaint(
            title="Broken classroom window",
            description="The classroom window latch is broken.",
            category=ComplaintCategory.Infrastructure,
            priority=ComplaintPriority.Medium,
            status=status,
            is_anonymous=False,
            created_by=(owner or self.student).id,
            assigned_to=None if unassigned else (assignee or self.staff).id,
        )
        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)
        return complaint

    def image(self, data=PNG_BYTES, content_type="image/png"):
        return UploadFile(
            file=BytesIO(data),
            filename="after-repair.png",
            headers=Headers({"content-type": content_type}),
        )

    def submit(self, complaint, staff=None, request_key=None, file=None, note="Replaced the damaged latch."):
        return asyncio.run(
            complaint_routes.submit_repair(
                complaint_id=complaint.id,
                note=note,
                request_key=str(request_key or uuid4()),
                file=file or self.image(),
                db=self.db,
                current_user=staff or self.staff,
            )
        )

    def test_student_can_submit_complaint_without_an_image(self):
        payload = ComplaintCreate(
            title="Water fountain leak",
            description="The fountain near the library is leaking.",
            category=ComplaintCategory.Infrastructure,
        )

        created = complaint_routes.create_complaint(payload, self.db, self.student)

        self.assertEqual(created.status, ComplaintStatus.Submitted)
        self.assertEqual(
            self.db.scalar(select(ComplaintAttachment.id).where(ComplaintAttachment.complaint_id == created.id)),
            None,
        )

    def test_assigned_employee_uploads_photo_and_note_then_student_can_approve(self):
        complaint = self.make_complaint()

        result = self.submit(complaint)

        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.AwaitingVerification)
        self.assertEqual(result["status"], ComplaintStatus.AwaitingVerification)
        history = complaint_routes.repair_history_payload(self.db, complaint, self.staff)
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["note"], "Replaced the damaged latch.")
        self.assertEqual(len(history[0]["attachments"]), 1)
        self.assertTrue(
            self.db.scalar(
                select(Notification.id).where(
                    Notification.user_id == self.student.id,
                    Notification.title == "Repair ready for verification",
                )
            )
        )

        decision = complaint_routes.submit_student_verification(
            complaint.id,
            RepairVerificationRequest(action="approve"),
            self.db,
            self.student,
        )

        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.Resolved)
        self.assertEqual(decision["status"], ComplaintStatus.Resolved)
        event = self.db.scalar(
            select(ComplaintEvent).where(
                ComplaintEvent.complaint_id == complaint.id,
                ComplaintEvent.event_type == "student_approved_repair",
            )
        )
        self.assertEqual(event.actor_id, self.student.id)

    def test_unassigned_staff_cannot_upload_or_close_complaint(self):
        complaint = self.make_complaint()

        with self.assertRaises(HTTPException) as upload_error:
            self.submit(complaint, staff=self.other_staff)
        self.assertEqual(upload_error.exception.status_code, 403)

        with self.assertRaises(HTTPException) as status_error:
            complaint_routes.change_status(
                complaint.id,
                StatusUpdateRequest(status=ComplaintStatus.Resolved),
                self.db,
                self.other_staff,
            )
        self.assertIn(status_error.exception.status_code, (403, 404))

    def test_student_can_verify_only_their_own_complaint(self):
        complaint = self.make_complaint(ComplaintStatus.AwaitingVerification)

        with self.assertRaises(HTTPException) as raised:
            complaint_routes.submit_student_verification(
                complaint.id,
                RepairVerificationRequest(action="approve"),
                self.db,
                self.other_student,
            )

        self.assertEqual(raised.exception.status_code, 404)
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.AwaitingVerification)

    def test_student_rejection_returns_work_and_retains_multiple_attempts(self):
        complaint = self.make_complaint()
        self.submit(complaint)

        complaint_routes.submit_student_verification(
            complaint.id,
            RepairVerificationRequest(action="still_not_fixed", reason="The frame is still loose."),
            self.db,
            self.student,
        )
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.InProgress)
        self.submit(complaint, request_key=uuid4())

        history = complaint_routes.repair_history_payload(self.db, complaint, self.student)
        self.assertEqual(len(history), 2)
        self.assertEqual([item["id"] for item in history], sorted(item["id"] for item in history))
        self.assertEqual(
            self.db.scalar(
                select(ComplaintEvent.id).where(
                    ComplaintEvent.complaint_id == complaint.id,
                    ComplaintEvent.event_type == "student_rejected_repair",
                )
            )
            is not None,
            True,
        )

    def test_retried_repair_request_does_not_duplicate_attempt_or_notification(self):
        complaint = self.make_complaint()
        request_key = uuid4()

        first = self.submit(complaint, request_key=request_key)
        second = self.submit(complaint, request_key=request_key)

        self.assertEqual(first["id"], second["id"])
        self.assertEqual(
            len(complaint_routes.repair_history_payload(self.db, complaint, self.staff)),
            1,
        )
        self.assertEqual(
            len(self.db.scalars(select(Notification).where(Notification.user_id == self.student.id)).all()),
            1,
        )

    def test_invalid_image_is_rejected_before_any_repair_is_recorded(self):
        complaint = self.make_complaint()

        with self.assertRaises(HTTPException) as raised:
            self.submit(complaint, file=self.image(data=b"not an image"))

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(complaint_routes.repair_history_payload(self.db, complaint, self.staff), [])
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.InProgress)

    def test_admin_assignment_requires_existing_staff_role_and_records_event(self):
        complaint = self.make_complaint(unassigned=True)

        with self.assertRaises(HTTPException):
            complaint_routes.assign_complaint(
                complaint.id,
                AssignComplaintRequest(staff_id=self.student.id),
                self.db,
                self.admin,
            )
        assigned = complaint_routes.assign_complaint(
            complaint.id,
            AssignComplaintRequest(staff_id=self.staff.id),
            self.db,
            self.admin,
        )
        self.assertEqual(assigned.assigned_to, self.staff.id)
        self.assertTrue(
            self.db.scalar(
                select(ComplaintEvent.id).where(
                    ComplaintEvent.complaint_id == complaint.id,
                    ComplaintEvent.event_type == "assigned",
                )
            )
        )

    def test_admin_repair_return_requires_assignee_and_keeps_audit_event(self):
        complaint = self.make_complaint(ComplaintStatus.AwaitingVerification)

        result = complaint_routes.admin_return_for_repair(
            complaint.id,
            AdminRepairReturnRequest(reason="The repair needs another adjustment."),
            self.db,
            self.admin,
        )

        self.db.refresh(complaint)
        self.assertEqual(result["status"], ComplaintStatus.InProgress)
        self.assertEqual(complaint.status, ComplaintStatus.InProgress)
        self.assertTrue(
            self.db.scalar(
                select(ComplaintEvent.id).where(
                    ComplaintEvent.complaint_id == complaint.id,
                    ComplaintEvent.event_type == "admin_returned_for_repair",
                )
            )
        )

    def test_admin_review_is_audited_and_notifies_once_per_admin_per_day(self):
        complaint = self.make_complaint(ComplaintStatus.AwaitingVerification)

        first = complaint_routes.record_admin_verification_review(complaint.id, self.db, self.admin)
        second = complaint_routes.record_admin_verification_review(complaint.id, self.db, self.admin)

        self.assertTrue(first["recorded"])
        self.assertFalse(second["recorded"])
        self.assertEqual(
            len(
                self.db.scalars(
                    select(ComplaintEvent).where(
                        ComplaintEvent.complaint_id == complaint.id,
                        ComplaintEvent.event_type == "admin_review",
                    )
                ).all()
            ),
            1,
        )
        self.assertEqual(
            len(
                self.db.scalars(
                    select(Notification).where(
                        Notification.complaint_id == complaint.id,
                        Notification.title == "Administrator reviewed pending verification",
                    )
                ).all()
            ),
            1,
        )

    def test_admin_nonresponse_closure_requires_confirmation_and_reason(self):
        complaint = self.make_complaint(ComplaintStatus.AwaitingVerification)

        with self.assertRaises(HTTPException):
            complaint_routes.admin_close_after_nonresponse(
                complaint.id,
                AdminNonResponseClosureRequest(confirmed=False, reason="No response received."),
                self.db,
                self.admin,
            )
        with self.assertRaises(ValidationError):
            complaint_routes.admin_close_after_nonresponse(
                complaint.id,
                AdminNonResponseClosureRequest(confirmed=True, reason="No reply"),
                self.db,
                self.admin,
            )
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.AwaitingVerification)

        complaint_routes.admin_close_after_nonresponse(
            complaint.id,
            AdminNonResponseClosureRequest(confirmed=True, reason="Reviewed the reminder history; no student response."),
            self.db,
            self.admin,
        )
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.Resolved)
        event = self.db.scalar(
            select(ComplaintEvent).where(
                ComplaintEvent.complaint_id == complaint.id,
                ComplaintEvent.event_type == "admin_nonresponse_closure",
            )
        )
        self.assertEqual(event.actor_id, self.admin.id)
        self.assertIn("not recorded as student approval", self.db.scalar(select(Notification.message).where(Notification.user_id == self.student.id, Notification.title == "Complaint administratively closed")))

    def test_due_notifications_are_idempotent_and_never_close_the_complaint(self):
        complaint = self.make_complaint()
        self.submit(complaint)
        repair = self.db.scalar(select(ComplaintRepairSubmission).where(ComplaintRepairSubmission.complaint_id == complaint.id))
        repair.submitted_at = repair.submitted_at - timedelta(hours=80)
        self.db.commit()

        test_settings = SimpleNamespace(verification_reminder_hours=24, verification_review_hours=72)
        with patch.object(complaint_routes, "get_settings", return_value=test_settings):
            first = complaint_routes.process_due_verification_notifications(self.db)
            second = complaint_routes.process_due_verification_notifications(self.db)

        self.assertEqual(first, {"reminders_sent": 1, "overdue_flags": 1})
        self.assertEqual(second, {"reminders_sent": 0, "overdue_flags": 0})
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.AwaitingVerification)

    def test_legacy_status_endpoint_cannot_mark_staff_work_resolved(self):
        complaint = self.make_complaint()

        with self.assertRaises(HTTPException) as raised:
            complaint_routes.change_status(
                complaint.id,
                StatusUpdateRequest(status=ComplaintStatus.Resolved),
                self.db,
                self.staff,
            )

        self.assertEqual(raised.exception.status_code, 400)
        self.db.refresh(complaint)
        self.assertEqual(complaint.status, ComplaintStatus.InProgress)

    def test_repair_and_review_routes_have_backend_role_guards(self):
        paths_and_roles = {
            ("POST", "/{complaint_id}/repairs"): (UserRole.staff, self.staff, self.student),
            ("POST", "/{complaint_id}/verification"): (UserRole.student, self.student, self.staff),
            ("GET", "/admin/verification"): (UserRole.admin, self.admin, self.staff),
            ("POST", "/admin/verification/{complaint_id}/close"): (UserRole.admin, self.admin, self.student),
        }
        routes = {
            (method, route.path): route
            for route in complaint_routes.router.routes
            for method in getattr(route, "methods", set())
        }
        for (method, path), (role, allowed_user, denied_user) in paths_and_roles.items():
            with self.subTest(method=method, path=path, role=role):
                route = routes[(method, path)]
                guards = [
                    dependency
                    for dependency in route.dependant.dependencies
                    if dependency.name in ("current_user", "_")
                    and getattr(dependency.call, "__name__", None) == "checker"
                ]
                self.assertEqual(
                    len(guards),
                    1,
                    repr([(dependency.name, getattr(dependency.call, "__name__", None)) for dependency in route.dependant.dependencies]),
                )
                self.assertIn(get_current_user, [item.call for item in guards[0].dependencies])
                self.assertIs(guards[0].call(allowed_user), allowed_user)
                with self.assertRaises(HTTPException) as raised:
                    guards[0].call(denied_user)
                self.assertEqual(raised.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
