from app.models.complaint import Complaint
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.complaint import ComplaintRead


def can_view_complaint(user: User, complaint: Complaint) -> bool:
    if user.role == UserRole.admin:
        return True
    if user.role == UserRole.student:
        return complaint.created_by == user.id
    if user.role == UserRole.staff:
        return complaint.assigned_to == user.id
    return False


def serialize_complaint_for_user(complaint: Complaint, user: User) -> ComplaintRead:
    response = ComplaintRead.model_validate(complaint)
    if complaint.is_anonymous and user.role == UserRole.staff:
        response.created_by = None
        response.creator = None
    return response
