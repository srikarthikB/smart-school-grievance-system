from typing import Literal

from pydantic import BaseModel, Field


class RepairVerificationRequest(BaseModel):
    action: Literal["approve", "still_not_fixed"]
    reason: str | None = Field(default=None, min_length=5, max_length=1000)


class AdminRepairReturnRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=1000)


class AdminRepairVerificationRequest(BaseModel):
    action: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=1000)


class AdminNonResponseClosureRequest(BaseModel):
    confirmed: bool
    reason: str = Field(min_length=10, max_length=1000)


class ReminderRequest(BaseModel):
    request_key: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
