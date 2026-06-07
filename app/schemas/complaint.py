from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.schemas.user import UserRead


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5)
    category: ComplaintCategory
    priority: ComplaintPriority = ComplaintPriority.Medium
    is_anonymous: bool = False


class ComplaintUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=5)
    category: ComplaintCategory | None = None
    priority: ComplaintPriority | None = None
    status: ComplaintStatus | None = None
    assigned_to: int | None = None
    resolution_notes: str | None = None


class AssignComplaintRequest(BaseModel):
    staff_id: int


class StatusUpdateRequest(BaseModel):
    status: ComplaintStatus
    resolution_notes: str | None = None


class ResolutionNotesRequest(BaseModel):
    resolution_notes: str


class ComplaintRead(BaseModel):
    id: int
    title: str
    description: str
    category: ComplaintCategory
    priority: ComplaintPriority
    status: ComplaintStatus
    is_anonymous: bool
    created_by: int | None
    assigned_to: int | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime
    creator: UserRead | None = None
    assignee: UserRead | None = None

    model_config = ConfigDict(from_attributes=True)
