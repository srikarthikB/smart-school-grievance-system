from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import ExpiredSignatureError, JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # BUG-01: Distinguish expired tokens from invalid ones so the client
    # can act accordingly (e.g. attempt a refresh vs. force re-login).
    try:
        payload = decode_access_token(token)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, Exception):
        raise credentials_error

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise credentials_error

    user = db.get(User, user_id)
    if not user:
        raise credentials_error

    # BUG-03: Guard against DB rows that stored the role as a raw string
    # (e.g. from a seed script or manual migration) instead of the enum member.
    if not isinstance(user.role, UserRole):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User account has a corrupted role value; contact an administrator.",
        )

    # BUG-04: Validate the token_version embedded in the JWT against the DB.
    # This allows server-side invalidation: logout or role change increments
    # token_version, making all previously issued tokens immediately invalid.
    # NOTE: The role claim in the JWT is informational only — authorization
    # always re-derives the role from the DB row (BUG-10).
    token_version = payload.get("tv")
    if token_version is None or token_version != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_roles(*roles: UserRole):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return current_user

    return checker