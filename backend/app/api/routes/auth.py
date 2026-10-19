from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead

router = APIRouter()


def _is_email_unique_violation(exc: IntegrityError) -> bool:
    original = exc.orig
    constraint_name = getattr(getattr(original, "diag", None), "constraint_name", None)
    if constraint_name is not None:
        return constraint_name == "ix_users_email"
    return str(original) == "UNIQUE constraint failed: users.email"


def _issue_token(user: User) -> str:
    """Create a JWT for user, embedding token_version so the server can
    invalidate it later by incrementing User.token_version (BUG-04).
    The role claim is informational only — authorization always re-derives
    the role from the DB row in get_current_user (BUG-10)."""
    return create_access_token(
        str(user.id),
        {"role": user.role.value, "tv": user.token_version},
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if payload.role != UserRole.student:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Public registration is student-only")
    existing = db.scalar(select(User.id).where(func.lower(User.email) == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.student,
        department=payload.department,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _is_email_unique_violation(exc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc
        raise
    db.refresh(user)
    return TokenResponse(access_token=_issue_token(user), user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash) or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=_issue_token(user), user=user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invalidate all existing JWTs for this user by bumping token_version (BUG-04)."""
    db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(token_version=User.token_version + 1)
    )
    db.commit()


@router.get("/me", response_model=UserRead)
def current_user(user: User = Depends(get_current_user)):
    return user