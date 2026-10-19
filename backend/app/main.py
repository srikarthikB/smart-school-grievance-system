import asyncio
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes import analytics, auth, complaints, feedback, users, notifications
from app.core.config import get_settings
from app.db.session import SessionLocal, get_db

logger = logging.getLogger(__name__)


def scan_verification_reminders():
    with SessionLocal() as db:
        complaints.process_due_verification_notifications(db)


async def verification_reminder_loop():
    while True:
        try:
            await asyncio.to_thread(scan_verification_reminders)
        except Exception:
            logger.exception("Scheduled repair verification reminder scan failed")
        await asyncio.sleep(60 * 60)


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(verification_reminder_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Smart School Grievance Management System API",
    version="1.0.0",
    description="REST API for school grievance submission, assignment, tracking, resolution, and feedback.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


@app.get("/api/ready", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        current_heads = tuple(sorted(MigrationContext.configure(db.connection()).get_current_heads()))
    except SQLAlchemyError as exc:
        logger.exception("Readiness check could not reach or inspect the database")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        ) from exc

    migrations_path = Path(__file__).resolve().parents[1] / "alembic"
    expected_heads = tuple(sorted(ScriptDirectory(str(migrations_path)).get_heads()))
    if current_heads != expected_heads:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database migrations are not up to date",
        )
    return {"status": "ready", "database": "ok", "migration_heads": current_heads}
