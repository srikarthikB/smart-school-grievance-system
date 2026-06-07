from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.complaint import Complaint
from app.models.enums import ComplaintCategory, ComplaintPriority, ComplaintStatus, Department, UserRole
from app.models.feedback import Feedback
from app.models.user import User


def get_or_create_user(db, name, email, role, department=None):
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(
        name=name,
        email=email,
        password_hash=hash_password("password123"),
        role=role,
        department=department,
    )
    db.add(user)
    db.flush()
    return user


def main():
    db = SessionLocal()
    try:
        admin = get_or_create_user(db, "School Admin", "admin@school.com", UserRole.admin, Department.Administration)
        staff = get_or_create_user(db, "Academic Staff", "academic@school.com", UserRole.staff, Department.Academic)
        student = get_or_create_user(db, "Student User", "student@school.com", UserRole.student, Department.Academic)

        if not db.scalar(select(Complaint).where(Complaint.title == "Lab projector not working")):
            db.add(
                Complaint(
                    title="Lab projector not working",
                    description="The projector in science lab 2 fails during practical sessions.",
                    category=ComplaintCategory.Infrastructure,
                    priority=ComplaintPriority.High,
                    status=ComplaintStatus.InProgress,
                    is_anonymous=False,
                    created_by=student.id,
                    assigned_to=staff.id,
                    resolution_notes="Replacement bulb requested from maintenance.",
                )
            )

        if not db.scalar(select(Complaint).where(Complaint.title == "Need extra calculus support")):
            db.add(
                Complaint(
                    title="Need extra calculus support",
                    description="Several students are struggling with recent calculus topics.",
                    category=ComplaintCategory.Academic,
                    priority=ComplaintPriority.Medium,
                    status=ComplaintStatus.Resolved,
                    is_anonymous=True,
                    created_by=student.id,
                    assigned_to=staff.id,
                    resolution_notes="Extra support class scheduled every Friday.",
                )
            )
            db.flush()

        resolved = db.scalar(select(Complaint).where(Complaint.title == "Need extra calculus support"))
        if resolved and not db.scalar(select(Feedback).where(Feedback.complaint_id == resolved.id)):
            db.add(Feedback(complaint_id=resolved.id, rating=5, comment="The extra class helped."))

        db.commit()
        print("Seed data created.")
        print("Admin: admin@school.com / password123")
        print("Staff: academic@school.com / password123")
        print("Student: student@school.com / password123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
