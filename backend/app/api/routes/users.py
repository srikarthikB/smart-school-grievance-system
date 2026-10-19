from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import AdminUserUpdate, UserCreate, UserRead

router = APIRouter()


def _is_email_unique_violation(exc: IntegrityError) -> bool:
    original = exc.orig
    constraint_name = getattr(getattr(original, "diag", None), "constraint_name", None)
    if constraint_name is not None:
        return constraint_name == "ix_users_email"
    return str(original) == "UNIQUE constraint failed: users.email"


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    email = payload.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
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
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    # Check email uniqueness if email is being changed
    new_email = data.get("email")
    if new_email and new_email.lower() != user.email.lower():
        if db.scalar(select(User.id).where(func.lower(User.email) == new_email.lower())):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        data["email"] = new_email.lower()

    password = data.pop("password", None)
    role = data.get("role")
    role_changed = role is not None and role != user.role
    active_status_changed = "is_active" in data and data["is_active"] != user.is_active

    if active_status_changed and not data["is_active"] and current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot deactivate themselves")

    for key, value in data.items():
        setattr(user, key, value)

    if password:
        user.password_hash = hash_password(password)

    if role_changed or active_status_changed or password:
        user.token_version = (user.token_version or 0) + 1

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _is_email_unique_violation(exc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc
        raise
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot delete themselves")
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_active:
        user.is_active = False
        user.token_version = (user.token_version or 0) + 1
    db.commit()
    return None