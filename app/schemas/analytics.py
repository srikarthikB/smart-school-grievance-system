from pydantic import BaseModel


class CountBucket(BaseModel):
    name: str
    count: int


class AnalyticsRead(BaseModel):
    total_complaints: int
    complaints_by_category: list[CountBucket]
    complaints_by_status: list[CountBucket]
    resolution_rate: float
