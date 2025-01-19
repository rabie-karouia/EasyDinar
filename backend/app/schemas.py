import re
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator, EmailStr
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    CIN: str
    phone_number: str
    address: str
    email: EmailStr
    password: str

    @field_validator("CIN")
    def validate_CIN(cls, value):
        if not re.match(r"^[01]\d{7}$", value):
            raise ValueError("CIN must be an 8-digit string starting with 0 or 1.")
        return value

    @field_validator("phone_number")
    def validate_phone_number(cls, value):
        if not value.isdigit():
            raise ValueError("Phone number must contain only digits.")
        if len(value) != 8:
            raise ValueError("Phone number must be exactly 8 digits long.")
        if value.startswith("0"):
            raise ValueError("Phone number must not start with 0.")
        return value

    @field_validator("password")
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")

        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must include at least one uppercase letter.")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must include at least one lowercase letter.")

        if not re.search(r"\d", value):
            raise ValueError("Password must include at least one digit.")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
            raise ValueError("Password must include at least one special character.")

        return value
class UserOut(BaseModel):
    client_identifier : str

    class Config:
        from_attributes = True

class AccountType(str, Enum):
    SAVINGS = "savings"
    CHECKING = "checking"

class AccountCreate(BaseModel):
    CIN: str = Field(..., description="User's CIN (8-digit string starting with 0 or 1)")
    account_type: AccountType = Field(..., description="Type of account: savings or checking")
    balance: float = Field(0, ge=0, description="Initial balance, must be non-negative")

class AccountResponse(BaseModel):
    account_number: str
    account_type: str
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

class UserDetails(BaseModel):
    first_name: str
    last_name: str
    CIN: str

class AccountDetailsResponse(BaseModel):
    account_number: str
    account_type: str
    balance: float
    created_at: str
    user: UserDetails

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = Field(None, description="User's email address")
    address: Optional[str] = Field(None, description="User's address")
    phone_number: Optional[str] = Field(None, pattern=r"^[1-9]\d{7}$", description="8-digit phone number not starting with 0")

    class Config:
        from_attributes = True

class AccountUpdate(BaseModel):
    account_type: Optional[AccountType] = Field(None, description="Type of account: savings or checking")
    balance: Optional[float] = Field(None, ge=0, description="Account balance (non-negative)")

    class Config:
        from_attributes = True


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr
