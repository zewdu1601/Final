import getpass
import sys

from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import AdminUserCreate


def create_admin_account(
    db: Session,
    *,
    email: str,
    username: str,
    full_name: str,
    password: str,
) -> User:
    if not email.strip() or not username.strip() or not full_name.strip():
        raise ValueError("Email, username, and full name are required.")

    try:
        account = AdminUserCreate(
            email=email.strip(),
            username=username.strip(),
            full_name=full_name.strip(),
            password=password,
            role="admin",
        )
    except ValidationError as error:
        messages = "; ".join(
            f"{'.'.join(str(part) for part in issue['loc'])}: {issue['msg']}"
            for issue in error.errors(include_input=False)
        )
        raise ValueError(messages) from error

    existing = db.query(User).filter(
        (func.lower(User.email) == account.email.lower())
        | (func.lower(User.username) == account.username.lower())
    ).first()
    if existing:
        raise ValueError("That email address or username is already in use.")

    user = User(
        email=account.email,
        username=account.username,
        full_name=account.full_name,
        hashed_password=get_password_hash(account.password),
        is_active=True,
        is_admin=True,
        role="admin",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise ValueError("That email address or username is already in use.") from error
    db.refresh(user)
    return user


def main() -> int:
    db = SessionLocal()
    try:
        email = input("Admin email: ")
        username = input("Username: ")
        full_name = input("Full name: ")
        password = getpass.getpass("Password (hidden): ")
        confirmation = getpass.getpass("Confirm password: ")
        if password != confirmation:
            raise ValueError("The passwords do not match.")
        user = create_admin_account(
            db,
            email=email,
            username=username,
            full_name=full_name,
            password=password,
        )
        print(f"Administrator account created for {user.email} (username: {user.username}).")
        return 0
    except (ValueError, EOFError) as error:
        print(f"Could not create administrator: {error}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
