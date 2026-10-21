from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    full_name: Optional[str] = None
    contact_phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=500)

    @field_validator("contact_phone", "address")
    @classmethod
    def trim_contact_details(cls, value: str) -> str:
        return value.strip()


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=72)


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(default=None, min_length=3, max_length=100)
    password: str = Field(min_length=1, max_length=72)

    @model_validator(mode="after")
    def require_login_identifier(self):
        if not self.email and not self.username:
            raise ValueError("Enter an email address or username")
        return self


class UserOut(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    role: Literal["admin", "manager", "customer"] = "customer"
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminUserCreate(UserBase):
    password: str = Field(min_length=10, max_length=72)
    role: Literal["admin", "manager", "customer"] = "customer"

    @field_validator("password")
    @classmethod
    def validate_admin_password_strength(cls, value: str) -> str:
        if not (
            any(character.islower() for character in value)
            and any(character.isupper() for character in value)
            and any(character.isdigit() for character in value)
        ):
            raise ValueError("Password must include an uppercase letter, a lowercase letter, and a number")
        return value


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(default=None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(default=None, max_length=255)
    role: Optional[Literal["admin", "manager", "customer"]] = None
    is_active: Optional[bool] = None

    @field_validator("username", "full_name")
    @classmethod
    def trim_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class AdminProfileUpdate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("username", "full_name")
    @classmethod
    def trim_profile_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(default=None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    contact_phone: Optional[str] = Field(default=None, max_length=40)
    address: Optional[str] = Field(default=None, max_length=500)

    @field_validator("username", "full_name")
    @classmethod
    def trim_profile_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("contact_phone", "address")
    @classmethod
    def trim_optional_contact_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def require_profile_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one profile field to update")
        return self


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=10, max_length=72)
    confirm_password: str = Field(min_length=10, max_length=72)

    @model_validator(mode="after")
    def validate_new_password(self):
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirmation do not match")
        return self


class StoreSettingsUpdate(BaseModel):
    store_name: str = Field(min_length=1, max_length=160)
    contact_email: str = Field(default="", max_length=255)
    contact_phone: str = Field(default="", max_length=40)
    address: str = Field(default="", max_length=500)

    @field_validator("store_name")
    @classmethod
    def trim_store_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Store name cannot be blank")
        return value

    @field_validator("contact_phone", "address")
    @classmethod
    def trim_optional_store_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("contact_email")
    @classmethod
    def validate_optional_email(cls, value: str) -> str:
        value = value.strip()
        if value and ("@" not in value or "." not in value.rsplit("@", 1)[-1]):
            raise ValueError("Enter a valid contact email address")
        return value


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
