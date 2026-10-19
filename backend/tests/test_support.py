from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    Complaint,
    ComplaintAttachment,
    ComplaintEvent,
    ComplaintRepairSubmission,
    Feedback,
    Notification,
    User,
)


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    try:
        Base.metadata.create_all(engine)
        test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        with test_session() as session:
            yield session
    finally:
        engine.dispose()
