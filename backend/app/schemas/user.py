from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Department, UserRole


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    role: UserRole = UserRole.student
    department: Department | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    """Fields any authenticated user may update about themselves.
    Role is intentionally absent — use AdminUserUpdate via an admin-only endpoint."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    department: Department | None = None
    password: str | None = Field(default=None, min_length=6)


class AdminUserUpdate(BaseModel):
    """Fields an admin may update on any user, including role and email."""

    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    role: UserRole | None = None
    department: Department | None = None
    password: str | None = Field(default=None, min_length=6)


class UserRead(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)