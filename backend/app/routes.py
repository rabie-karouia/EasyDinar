from typing import List, Optional
import httpx
import jwt
import traceback
from fastapi import APIRouter, Depends, HTTPException, Query, Form
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import SecretStr
from sqlalchemy import Date, and_
from sqlalchemy.orm import Session
from twilio.rest import Client
from app.models import User, Account, LoanEligibilityResponse, LoanEligibilityRequest, BranchATM, Transaction, \
    TransactionResponse
from app.db_connection import get_db
from app.schemas import UserCreate, AccountCreate, UserOut, pwd_context, AccountResponse, \
    UserUpdate, AccountUpdate, PasswordRecoveryRequest
from app.utils import hash_password, oauth2_scheme, get_current_user, get_exchange_rate, \
     calculate_distance, calculate_eligibility
from datetime import datetime, timedelta

SECRET_KEY = "053d2487fe036906e497f07aa3a798c4ed2445d6c1e6f2342c71cb5912b48873"
ALGORITHM = "HS256"


router = APIRouter()

@router.post("/users/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        print(f"Received password: {user.password}")
        hashed_password = hash_password(user.password)

        db_user = User(
            first_name=user.first_name,
            last_name=user.last_name,
            CIN=user.CIN,
            phone_number=user.phone_number,
            address=user.address,
            email=user.email,
            password=hashed_password,

        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        return UserOut(
            client_identifier=db_user.client_identifier
            )



    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/users/")
def get_users(
    cin: str = None,
    email: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    logged_in_cin = current_user["cin"]
    logged_in_role = current_user["role"]


    if logged_in_role == "admin":
        query = db.query(User)
        if cin:
            query = query.filter(User.CIN == cin)
        if email:
            query = query.filter(User.email == email)
        users = query.all()


        if not users:
            raise HTTPException(
                status_code=404,
                detail="No users found with the provided credentials."
            )

        return users


    if cin and cin != logged_in_cin:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this user's information."
        )

    if not cin and not email:
        raise HTTPException(
            status_code=403,
            detail="Non-admins are not authorized to query all users."
        )


    query = db.query(User).filter(User.CIN == logged_in_cin)
    users = query.all()


    if not users:
        raise HTTPException(
            status_code=404,
            detail="No users found with the provided credentials."
        )

    return users


def generate_account_number(user_id: int) -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"{user_id:04d}{timestamp[-10:]}"



@router.put("/users/{user_id}", response_model=dict)
def update_user(
    CIN: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    logged_in_cin = current_user["cin"]
    if CIN != logged_in_cin:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update this user's information."
        )


    db_user = db.query(User).filter(User.CIN == CIN).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")


    if user_update.email:
        db_user.email = user_update.email
    if user_update.address:
        db_user.address = user_update.address
    if user_update.phone_number:
        db_user.phone_number = user_update.phone_number


    db.commit()
    db.refresh(db_user)

    return {"message": "User information updated successfully."}






@router.post("/accounts/")
def create_account(account: AccountCreate,
                   db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user),
):

    logged_in_cin = current_user["cin"]


    if logged_in_cin != account.CIN:
        raise HTTPException(
            status_code=403,
            detail="The provided CIN does not match the logged-in user's CIN."
        )


    user = db.query(User).filter(User.CIN == account.CIN).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with the provided CIN not found.")


    account_number = generate_account_number(user.id)


    db_account = Account(
        user_id=user.id,
        account_type=account.account_type.value,
        balance=account.balance,
        account_number=account_number
    )

    db.add(db_account)
    db.commit()
    db.refresh(db_account)


    return {
        "account": {
            "account_number": db_account.account_number,
            "CIN": user.CIN,
            "account_type": db_account.account_type,
            "balance": db_account.balance
        },
        "message": "Account successfully created."
    }



@router.get("/accounts/", response_model=List[AccountResponse])
def get_accounts(
    cin: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    logged_in_cin = current_user["cin"]
    if cin is None:
        cin = logged_in_cin

    if cin != logged_in_cin:
        raise HTTPException(
            status_code=403,
            detail="The provided CIN does not match the logged-in user's CIN.",
        )

    accounts = db.query(Account).join(User).filter(User.CIN == cin).all()

    if not accounts:
        raise HTTPException(
            status_code=404,
            detail="No accounts found with the provided CIN.",
        )

    return accounts




@router.get("/accounts/{account_number}/details", response_model=AccountResponse)
def get_account_details(
    account_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    logged_in_cin = current_user["cin"]


    account = db.query(Account).filter(Account.account_number == account_number).first()


    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")


    user = db.query(User).filter(User.id == account.user_id).first()
    if not user:
        raise HTTPException(
            status_code=404, detail="User associated with the account not found."
        )


    if user.CIN != logged_in_cin:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to access this account."
        )


    return AccountResponse(
        account_number=account.account_number,
        account_type=account.account_type,
        balance=account.balance,
        created_at=account.created_at
    )


@router.put("/accounts/{account_number}", response_model=dict)
def update_account(
    account_number: str,
    account_update: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403, detail="You do not have permission to modify account details."
        )


    db_account = db.query(Account).filter(Account.account_number == account_number).first()
    if not db_account:
        raise HTTPException(status_code=404, detail="Account not found.")


    if account_update.account_type:
        db_account.account_type = account_update.account_type.value
    if account_update.balance is not None:
        db_account.balance = account_update.balance

    db.commit()
    db.refresh(db_account)

    return {"message": "Account details updated successfully."}


@router.post("/auth/login")
def login(client_identifier: str, password: str, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.client_identifier == client_identifier).first()

    if not db_user or not pwd_context.verify(password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")


    expiration_time = datetime.utcnow() + timedelta(hours=6)
    token_data = {
        "user_id": db_user.id,
        "cin": db_user.CIN,
        "role": db_user.role,
        "exp": expiration_time.timestamp()
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "message": "Login successful",
        "user": {
            "client identifier": db_user.client_identifier,
            "cin": db_user.CIN
        }

    }

token_blacklist = set()

EMAIL_CONF = ConnectionConfig(
    MAIL_USERNAME="AKIARHQBNU3PIQVPL4X4",
    MAIL_PASSWORD=SecretStr("BJPsNT1zkqdoofpjDPltT8zjqdh6ad1pFto3Rz7YWu8V"),
    MAIL_FROM="rabiekarouia18@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="email-smtp.eu-north-1.amazonaws.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

@router.post("/update-password")
def update_password(
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    user = db.query(User).filter(User.id == current_user["user_id"]).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")


    if not pwd_context.verify(old_password, user.password):
        raise HTTPException(
            status_code=401, detail="Old password is incorrect."
        )


    user.password = pwd_context.hash(new_password)
    db.commit()
    db.refresh(user)

    return {"message": "Password updated successfully."}


@router.post("/password-recovery/")
async def password_recovery(request: PasswordRecoveryRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email does not exist.")


    reset_token = jwt.encode(
        {
            "user_id": user.id,
            "exp": datetime.utcnow() + timedelta(hours=1)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"


    message = MessageSchema(
        subject="Password Recovery",
        recipients=[request.email],
        body=(
            f"Hello {user.first_name},\n\n"
            f"We received a request to reset your password. "
            f"Click the link below to reset your password:\n\n"
            f"{reset_link}\n\n"
            f"If you did not request this, please ignore this email.\n\n"
            f"Best regards,\nEasyDinar Team"
        ),
        subtype=MessageType("plain")
    )


    fm = FastMail(EMAIL_CONF)
    await fm.send_message(message)

    return {"message": "Password recovery email has been sent."}

@router.post("/reset-password")
async def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid token.")


        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")


        user.password = hash_password(new_password)
        db.commit()

        return {"message": "Password reset successful."}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid token.")




@router.post("/auth/logout")
def logout(token: str = Depends(oauth2_scheme)):

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")


        if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Token has already expired.")


        token_blacklist.add(token)
        return {"message": "You have been successfully logged out."}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has already expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")


@router.get("/exchange-rate/")
def fetch_exchange_rate(
    base_currency: str = Query(..., description="The base currency (e.g., USD)"),
    target_currency: str = Query(..., description="The target currency (e.g., EUR)")
):
    base_currency =base_currency.upper()
    target_currency =target_currency.upper()

    if base_currency == target_currency:
        raise HTTPException(status_code=400, detail="Base and target currencies cannot be the same.")

    rate = get_exchange_rate(base_currency, target_currency)
    return {"base_currency": base_currency, "target_currency": target_currency, "rate": rate}

@router.get("/branches-atms", response_model=list[dict])
def get_all_branches_and_atms(db: Session = Depends(get_db)):

    try:
        locations = db.query(BranchATM).all()
        return [
            {
                "id": location.id,
                "name": location.name,
                "type": location.type,
                "address": location.address,
                "latitude": location.latitude,
                "longitude": location.longitude,
            }
            for location in locations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {e}")



@router.get("/branches-atms/nearby")
def get_nearby_branches_atms(
    latitude: float = Query(..., description="User's current latitude"),
    longitude: float = Query(..., description="User's current longitude"),
    radius: float = Query(4.0, description="Radius in kilometers "),
    db: Session = Depends(get_db)
):
    
    try:
        locations = db.query(BranchATM).all()
        nearby_locations = []

        for location in locations:
            distance = calculate_distance(latitude, longitude, location.latitude, location.longitude)
            if distance <= radius:
                nearby_locations.append({
                    "id": location.id,
                    "name": location.name,
                    "type": location.type,
                    "address": location.address,
                    "latitude": location.latitude,
                    "longitude": location.longitude,
                    "distance": round(distance, 2),
                })

        return nearby_locations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching nearby locations: {e}")


@router.post("/loan-eligibility", response_model=LoanEligibilityResponse)
async def check_loan_eligibility(request: LoanEligibilityRequest):

    eligibility_result = calculate_eligibility(
        income=request.income,
        debt=request.debt,
        savings=request.savings,
        employment_status=request.employment_status
    )


    return LoanEligibilityResponse(
        score=eligibility_result["score"],
        loan_eligibility=eligibility_result["loan_eligibility"],
        recommendations=eligibility_result.get("recommendations"),
        loan_links=eligibility_result.get("loan_links")
    )

TWILIO_ACCOUNT_SID = "AC0833f2a432aa94cf9216094221ddfad0"
TWILIO_AUTH_TOKEN = "f580e839885036e43c40c39931b3b493"
VERIFY_SERVICE_SID = "VA2c783461a8b554540d5ddbfa05d82554"


client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

@router.post("/send-verification")
async def send_verification(
    phone_number: str = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:

        print(f"Current user object: {current_user}")


        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid user information (missing user_id).")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")


        if user.two_fa == "on":
            return {
                "success": False,
                "message": "2FA is already enabled for your account."
            }


        if not phone_number.startswith("+"):
            raise HTTPException(
                status_code=400,
                detail="Phone number must include a country code (e.g., +1234567890).",
            )


        verification = client.verify.v2.services(VERIFY_SERVICE_SID).verifications.create(
            to=phone_number, channel="sms"
        )


        print(f"Verification initiated for {phone_number}: {verification.status}")

        return {"success": True, "message": "Verification code sent successfully."}
    except Exception as e:
        print(f"Error sending verification: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error sending verification: {str(e)}")




@router.post("/verify-code")
async def verify_code(
    phone_number: str = Form(...),
    code: str = Form(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:

        if not phone_number.startswith("+"):
            raise HTTPException(
                status_code=400,
                detail="Phone number must include a country code (e.g., +1234567890).",
            )


        verification_check = client.verify.services(VERIFY_SERVICE_SID).verification_checks.create(
            to=phone_number, code=code
        )


        print(f"Verification check for {phone_number}: {verification_check.status}")

        if verification_check.status == "approved":

            user_cin = current_user.get("cin")
            if not user_cin:
                raise HTTPException(status_code=400, detail="CIN not found for the logged-in user.")


            user = db.query(User).filter(User.CIN == user_cin).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")


            user.two_fa = "on"
            db.commit()
            db.refresh(user)

            return {"success": True, "message": "Two-factor authentication enabled successfully."}
        else:
            return {"success": False, "message": "Invalid verification code."}
    except Exception as e:
        print(f"Error verifying code: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error verifying code: {str(e)}")




PAYMEE_API_KEY = "d55df318bc7f94145545d9fb32cb3650e93af767"
PAYMEE_BASE_URL = "https://sandbox.paymee.tn/api/v2/payments/create"

@router.post("/generate-payment")
async def generate_payment(
    amount: float = Query(..., description="The payment amount in TND"),
    email: str = Query(..., description="Payer's email address"),
    first_name: str = Query(..., description="Payer's first name"),
    last_name: str = Query(..., description="Payer's last name"),

):
    success_link="https://localhost:5173/dashboard"
    fail_link="https://localhost:5173/dashboard"
    webhook_url="https://localhost:8000/webhook/"
    """
    Generate a payment request using Paymee's API.
    """
    headers = {
        "Authorization": f"Token {PAYMEE_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "vendor": "your_vendor_id",
        "amount": str(amount),
        "note": "Payment for goods or services",
        "success_url": success_link,
        "fail_url": fail_link,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "webhook_url": webhook_url
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(PAYMEE_BASE_URL, json=payload, headers=headers)
            response_data = response.json()


            if response.status_code == 201 or response_data.get("status") is True:

                return {
                    "status": response_data.get("status"),
                    "message": response_data.get("message"),
                    "payment_url": response_data["data"]["payment_url"],
                    "amount": response_data["data"]["amount"],
                    "email": response_data["data"]["email"],
                    "first_name": response_data["data"]["first_name"],
                    "last_name": response_data["data"]["last_name"]
                }
            else:

                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Paymee API error: {response.text}"
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate payment: {str(e)}")


@router.get("/check-payment")
async def check_payment(token: str):

    paymee_check_url = f"https://sandbox.paymee.tn/api/v2/payments/{token}/check"

    headers = {
        "Authorization": f"Token {PAYMEE_API_KEY}"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(paymee_check_url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            if data.get("status", False):
                return {
                    "status": data["status"],
                    "message": data["message"],
                    "payment_details": data["data"]
                }
            else:
                raise HTTPException(
                    status_code=400, detail=f"Payment status check failed: {data.get('message', 'Unknown error')}"
                )
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to check payment status: {response.text}",
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")





@router.post("/webhook")
async def payment_webhook(payload: dict):

    print("Webhook received:", payload)
    return {"message": "Webhook received successfully"}


@router.post("/deposit")
async def deposit(
    amount: float = Query(..., description="The amount to deposit"),
    account_number: str = Query(..., description="The account number for the deposit"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")


    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")


    user = db.query(User).filter(User.id == account.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User associated with the account not found")

    logged_in_cin = current_user["cin"]
    if user.CIN != logged_in_cin:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to deposit into this account"
        )

    account.balance += amount

    transaction = Transaction(
        account_number=account.account_number,
        type="deposit",
        amount=amount
    )
    db.add(transaction)
    db.commit()
    db.refresh(account)

    return {
        "message": f"{amount} TND deposited successfully",
        "new_balance": account.balance,
        "account_number": account.account_number
    }



@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    cin: Optional[str] = None,
    account_number: Optional[str] = None,
    date_of_transaction: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    logged_in_cin = current_user["cin"]
    logged_in_role = current_user["role"]

    query = db.query(Transaction).join(Account).join(User)

    if logged_in_role != "admin":
        query = query.filter(User.CIN == logged_in_cin)

        if cin and cin != logged_in_cin:
            raise HTTPException(
                status_code=403,
                detail="You are not authorized to view transactions for this CIN.",
            )

        if account_number:
            account = db.query(Account).join(User).filter(
                and_(
                    Account.account_number == account_number,
                    User.CIN == logged_in_cin,
                )
            ).first()

            if not account:
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to view transactions for this account.",
                )

            query = query.filter(Transaction.account_number == account_number)

        if date_of_transaction:
            try:
                transaction_date = datetime.strptime(date_of_transaction, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date format. Please use YYYY-MM-DD.",
                )


            query = query.filter(
                and_(
                    Transaction.timestamp.cast(Date) == transaction_date,
                    Transaction.account_number.in_(
                        db.query(Account.account_number).join(User).filter(User.CIN == logged_in_cin)
                    ),
                )
            )


    else:
        if cin:
            query = query.filter(User.CIN == cin)

        if account_number:
            query = query.filter(Transaction.account_number == account_number)

        if date_of_transaction:
            try:
                transaction_date = datetime.strptime(date_of_transaction, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date format. Please use YYYY-MM-DD.",
                )

            query = query.filter(Transaction.timestamp.cast(Date) == transaction_date)


    transactions = query.order_by(Transaction.timestamp.desc()).all()

    if not transactions:
        raise HTTPException(status_code=404, detail="No transactions yet.")

    return transactions



@router.post("/withdraw")
async def withdraw(
    amount: float = Query(..., description="The amount to withdraw"),
    account_number: str = Query(..., description="The account number for the withdrawal"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")


    account = db.query(Account).filter(Account.account_number == account_number).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")


    user = db.query(User).filter(User.id == account.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User associated with the account not found")


    logged_in_cin = current_user["cin"]
    if user.CIN != logged_in_cin:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to withdraw from this account"
        )


    if account.balance < amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")


    account.balance -= amount


    transaction = Transaction(
        account_number=account.account_number,
        type="withdraw",
        amount=amount
    )
    db.add(transaction)
    db.commit()
    db.refresh(account)

    return {
        "message": f"{amount} TND withdrawn successfully",
        "new_balance": account.balance,
        "account_number": account.account_number
    }


