from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None or payload.get("ver", 0) != user.token_version:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    except (TypeError, ValueError):
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative privileges",
        )
    return current_user


def get_current_store_manager(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin and current_user.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have store management privileges",
        )
    return current_user


def get_optional_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(optional_oauth2_scheme),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload["sub"])
        user = db.query(User).filter(User.id == user_id).first()
    except (JWTError, KeyError, TypeError, ValueError):
        return None
    if user is None or not user.is_active or payload.get("ver", 0) != user.token_version:
        return None
    return user
