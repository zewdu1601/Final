from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import PasswordChange, UserCreate, UserLogin, UserOut, UserProfileUpdate, Token
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter((User.email == user_in.email) | (User.username == user_in.username)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email or username already exists.",
        )
    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        contact_phone=user_in.contact_phone,
        address=user_in.address,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    if login_data.email:
        user = db.query(User).filter(User.email == login_data.email).first()
    else:
        user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive account")
    
    token = create_access_token(user.id, token_version=user.token_version)
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_current_user(
    update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    values = update.model_dump(exclude_unset=True, exclude_none=True)
    if not values:
        raise HTTPException(status_code=422, detail="Provide at least one profile field to update.")
    if "email" in values and db.query(User).filter(
        func.lower(User.email) == values["email"].lower(), User.id != current_user.id
    ).first():
        raise HTTPException(status_code=409, detail="That email address is already in use.")
    if "username" in values and db.query(User).filter(
        func.lower(User.username) == values["username"].lower(), User.id != current_user.id
    ).first():
        raise HTTPException(status_code=409, detail="That username is already in use.")

    for field, value in values.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    password_change: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(password_change.new_password)
    current_user.token_version += 1
    db.commit()


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.token_version += 1
    db.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
