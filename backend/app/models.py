import random
import re
from datetime import datetime
from typing import Optional, Dict, List
from typing_extensions import Annotated
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func, Enum, JSON
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.orm import validates
from typing import ClassVar

Base = declarative_base()



class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    account_type = Column(String(8))
    balance = Column(Float, default=0)
    account_number = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(100), ForeignKey("accounts.account_number"), nullable=False)
    type = Column(String(10), nullable=False)
    amount = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=func.now())


    account = relationship("Account", back_populates="transactions")

class TransactionResponse(BaseModel):
    id: int
    account_number: str
    type: str
    amount: float
    timestamp : datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    client_identifier = Column(String(8), unique=True, nullable=False)
    first_name = Column(String(30), nullable=False)
    last_name = Column(String(30), nullable=False)
    CIN = Column(String(8), nullable=False)
    phone_number = Column(String(8), nullable=False, unique=True)
    address = Column(String(255), nullable=True)
    email = Column(String(60), unique=True, nullable=False)
    password = Column(String(500), nullable=False)
    role = Column(String(20), default="user")
    two_fa = Column(String(10), nullable=False, default="off")

    accounts = relationship("Account", back_populates="user")

    def __init__(self, first_name, last_name, CIN, phone_number, address, email, password):
        self.first_name = first_name
        self.last_name = last_name
        self.CIN = CIN
        self.phone_number = phone_number
        self.address = address
        self.email = email
        self.password = password
        self.client_identifier = self.generate_client_identifier()

    @staticmethod
    def generate_client_identifier():
        return str(random.randint(10000000, 99999999))

    @validates("CIN")
    def validate_CIN(self, key, value):
        if not re.match(r"^[01]\d{7}$", value):
            raise ValueError("CIN must be an 8-digit string starting with 0 or 1.")
        return value

    @validates("email")
    def validate_email(self, key, value):
        if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", value):
            raise ValueError("Invalid email format.")
        return value

    @validates("password")
    def validate_password(self, key, value):

        if not isinstance(value, str):
            raise ValueError("Password must be a string.")

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

class BranchATM(Base):
    __tablename__ = "branches_and_atms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    type = Column(Enum("branch", "atm", name="branch_atm_type"), nullable=False)
    address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    operational_hours = Column(JSON, nullable=True)
    queue_size = Column(Integer, default=0)

class EmploymentStatus(str, Enum):
    employed = "employed"
    self_employed = "self-employed"
    unemployed = "unemployed"


class LoanEligibilityRequest(BaseModel):
    income: float
    debt: float
    savings: float
    employment_status: ClassVar[type] = EmploymentStatus

class LoanEligibilityResponse(BaseModel):
    score: int
    loan_eligibility: str
    recommendations: Optional[str] = None
    loan_links: Annotated[List[Dict[str, str]], Field(default_factory=list)]
