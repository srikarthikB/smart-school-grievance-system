from enum import StrEnum


class UserRole(StrEnum):
    student = "student"
    staff = "staff"
    admin = "admin"


class Department(StrEnum):
    Academic = "Academic"
    Discipline = "Discipline"
    Infrastructure = "Infrastructure"
    Transport = "Transport"
    Administration = "Administration"


class ComplaintCategory(StrEnum):
    Academic = "Academic"
    Faculty = "Faculty"
    Student = "Student"
    Infrastructure = "Infrastructure"
    Transport = "Transport"
    Administration = "Administration"
    Other = "Other"


class ComplaintPriority(StrEnum):
    Low = "Low"
    Medium = "Medium"
    High = "High"


class ComplaintStatus(StrEnum):
    Submitted = "Submitted"
    UnderReview = "Under Review"
    InProgress = "In Progress"
    Resolved = "Resolved"
    Rejected = "Rejected"


def enum_values(enum_cls):
    return [member.value for member in enum_cls]
