import re

from app.models.complaint import Complaint
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.complaint import ComplaintRead


_AMBIGUOUS_NAME_PARTS = {
    "ann",
    "april",
    "autumn",
    "bill",
    "brown",
    "cook",
    "dawn",
    "faith",
    "ford",
    "grace",
    "green",
    "hall",
    "hope",
    "hunter",
    "joy",
    "june",
    "king",
    "lane",
    "mark",
    "may",
    "page",
    "park",
    "reed",
    "robin",
    "rose",
    "smith",
    "stone",
    "summer",
    "taylor",
    "white",
    "will",
    "wood",
    "woods",
    "young",
}


def can_view_complainant_identity(user: User, complaint: Complaint) -> bool:
    return (
        not complaint.is_anonymous
        or user.role == UserRole.admin
        or complaint.created_by == user.id
    )


def redact_anonymous_identity(value: str, user: User, complaint: Complaint) -> str:
    if (
        can_view_complainant_identity(user, complaint)
        or not complaint.creator
        or not complaint.creator.name
    ):
        return value
    name_parts = re.findall(r"\w+", complaint.creator.name)
    distinctive_parts = {
        part
        for part in name_parts
        if len(part) > 2 and part.casefold() not in _AMBIGUOUS_NAME_PARTS
    }
    full_name = complaint.creator.name.strip()
    if len(name_parts) == 1 and full_name.casefold() in _AMBIGUOUS_NAME_PARTS:
        full_name = ""
    candidates = distinctive_parts | ({full_name} if full_name else set())
    creator_email = complaint.creator.email.strip() if complaint.creator.email else ""
    if creator_email:
        candidates.add(creator_email)
    redacted = value
    if candidates:
        pattern = r"(?<!\w)(?:" + "|".join(
            re.escape(part) for part in sorted(candidates, key=len, reverse=True)
        ) + r")(?!\w)"
        redacted = re.sub(pattern, "[anonymous student]", redacted, flags=re.IGNORECASE)

    ambiguous_parts = {
        part.casefold()
        for part in name_parts
        if part.casefold() in _AMBIGUOUS_NAME_PARTS
    }
    for part in ambiguous_parts:
        context_pattern = (
            r"(?<!\w)(?P<prefix>(?:student|complainant|reported by|submitted by|"
            r"filed by|posted by)\s+)?"
            r"(?P<name>" + re.escape(part) + r")"
            r"(?P<suffix>\s+(?:reported|submitted|filed|posted|described|"
            r"complained|requested|confirmed|approved|rejected|uploaded|"
            r"noted|contacted|raised|experienced)\b)?(?!\w)"
        )

        def redact_in_identity_context(match: re.Match[str]) -> str:
            if not match.group("prefix") and not match.group("suffix"):
                return match.group(0)
            return f"{match.group('prefix') or ''}[anonymous student]{match.group('suffix') or ''}"

        redacted = re.sub(
            context_pattern,
            redact_in_identity_context,
            redacted,
            flags=re.IGNORECASE,
        )
    return redacted


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
    if not can_view_complainant_identity(user, complaint):
        response.created_by = None
        response.creator = None
        response.title = redact_anonymous_identity(response.title, user, complaint)
        response.description = redact_anonymous_identity(response.description, user, complaint)
        if response.resolution_notes is not None:
            response.resolution_notes = redact_anonymous_identity(
                response.resolution_notes,
                user,
                complaint,
            )
    return response
