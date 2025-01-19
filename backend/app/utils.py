import json
import math
from passlib.context import CryptContext
import jwt
from fastapi import HTTPException, status, Depends, requests
from fastapi.security import OAuth2PasswordBearer
from app.models import User, BranchATM
from app.db_connection import get_db, SessionLocal
from sqlalchemy.orm import Session
import requests



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

SECRET_KEY = "053d2487fe036906e497f07aa3a798c4ed2445d6c1e6f2342c71cb5912b48873"
ALGORITHM = "HS256"

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("Decoded Payload:", payload)
        user_id = payload.get("user_id")
        cin = payload.get("cin")
        if not user_id or not cin:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials (missing user_id or CIN)"
            )

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials (user not found)"
            )

        return {"user_id": user.id, "cin": cin, "role": user.role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")




def role_required(required_role: str):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{required_role} privileges required"
            )
        return current_user
    return role_checker






pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def require_admin(db: Session = Depends(get_db), current_user: dict = Depends(oauth2_scheme)):
    db_user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if db_user.role != "admin":
        raise HTTPException(
            status_code=403, detail="You do not have permission to perform this action."
        )
    return db_user


EXCHANGE_RATE_API_URL = " https://v6.exchangerate-api.com/v6"
EXCHANGE_RATE_API_KEY = "6ba01a2f513e65e6e7110aa5"

def get_exchange_rate(base_currency: str, target_currency: str) -> float:
    try:
        response = requests.get(
            f"{EXCHANGE_RATE_API_URL}/{EXCHANGE_RATE_API_KEY}/latest/{base_currency}"
        )
        response.raise_for_status()
        data = response.json()

        if data.get("result") != "success":
            raise Exception(data.get("error-type", "API error"))

        rates = data.get("conversion_rates", {})
        if target_currency not in rates:
            raise Exception(f"Currency '{target_currency}' not found in response.")

        return rates[target_currency]

    except requests.exceptions.RequestException as e:
        raise Exception(f"Network error: {str(e)}")


type_mapping = {
    "bank": "branch",
    "atm": "atm",
}

def insert_data_from_osm(osm_file: str):
    try:
        with open(osm_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        if "features" not in data or not data["features"]:
            print("No features found in the JSON file.")
            return

        print(f"Loaded {len(data['features'])} features.")

        session = SessionLocal()

        for feature in data["features"]:
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})

            name = properties.get("name", "Unknown")
            amenity = properties.get("amenity", "unknown")
            latitude = geometry["coordinates"][1] if geometry.get("type") == "Point" else None
            longitude = geometry["coordinates"][0] if geometry.get("type") == "Point" else None
            street = properties.get("addr:street", "Unknown Street")
            city = properties.get("addr:city", "Unknown City")
            address = f"{street}, {city}"

            db_type = type_mapping.get(amenity, "Unknown")
            if db_type == "Unknown":
                print(f"Warning: Unsupported amenity type '{amenity}'")
                continue

            print(f"Inserting: {name}, {db_type}, {latitude}, {longitude}, {address}")

            branch_atm = BranchATM(
                name=name,
                type=db_type,
                address=address,
                latitude=latitude,
                longitude=longitude,
            )
            session.add(branch_atm)

        session.commit()
        print(f"Inserted {session.query(BranchATM).count()} records.")

    except Exception as e:
        print(f"Error inserting data: {e}")

def remove_unknown_names():
    session = SessionLocal()
    try:
        rows_deleted = session.query(BranchATM).filter(BranchATM.name == "Unknown").delete()
        session.commit()
        print(f"Deleted {rows_deleted} rows with 'Unknown' names.")
    except Exception as e:
        print(f"Error during deletion: {e}")
        session.rollback()
    finally:
        session.close()

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Radius of the Earth in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_eligibility(income: float, debt: float, savings: float, employment_status: str) -> dict:
    score = 0


    if income > 2500:
        score += 15
    elif income > 1800:
        score += 10
    else:
        score += 5


    debt_to_income_ratio = debt / income
    if debt_to_income_ratio < 0.3:
        score += 15
    elif debt_to_income_ratio < 0.5:
        score += 10
    else:
        score += 0

    savings_rate = savings / income
    if savings_rate > 0.2:
        score += 15
    elif savings_rate > 0.1:
        score += 10
    else:
        score += 5

    # Employment status
    if employment_status == "employed":
        score += 10
    elif employment_status == "self-employed":
        score += 5
    else:
        score += 0


    loan_links = []

    if score >= 40:
        eligibility = "Eligible for large personal/business loans"
        recommendations = "You are eligible for high-value loans. Consider applying for personal or business loans."
        loan_links = [
            {"bank": "BH Bank", "url": "https://www.bh.com.tn/cr%C3%A9dit-am%C3%A9nagement"},
            {"bank": "ATTIJARI Bank", "url": "https://www.attijaribank.com.tn/fr/simulateur"},
            {"bank": "BNA Bank", "url": "http://www.bna.tn/site/fr/simulateur.php?id_article=587"},
            {"bank": "AMEN Bank", "url": "https://www.amenbank.com.tn/fr/simulateur.html"},
            {"bank": "ZITOUNA Bank", "url": "https://www.banquezitouna.com/fr/simulateur"}

        ]
    elif score >= 30:
        eligibility = "Eligible for micro-loans"
        recommendations = "You are eligible for micro-loans. Consider applying for a smaller loan."
        loan_links = [
            {"bank": "BH Bank", "url": "https://www.bh.com.tn/cr%C3%A9dit-am%C3%A9nagement"},
            {"bank": "ATTIJARI Bank", "url": "https://www.attijaribank.com.tn/fr/simulateur"},
            {"bank": "BNA Bank", "url": "http://www.bna.tn/site/fr/simulateur.php?id_article=587"},
            {"bank": "AMEN Bank", "url": "https://www.amenbank.com.tn/fr/simulateur.html"},
            {"bank": "ZITOUNA Bank", "url": "https://www.banquezitouna.com/fr/simulateur"}
        ]
    else:
        eligibility = "Not eligible"
        recommendations = "Improve your financial health by reducing debt and increasing savings."

    return {"score": score, "loan_eligibility": eligibility, "recommendations": recommendations, "loan_links": loan_links}


