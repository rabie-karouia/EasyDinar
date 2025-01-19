from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.models import Base
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


engine = create_engine(DATABASE_URL, echo=True)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base.metadata.create_all(bind=engine)
print("Tables created successfully.")

with engine.connect() as connection:
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("users")]
    if "two_fa" not in columns:
        alter_table_query = text("ALTER TABLE users ADD COLUMN two_fa VARCHAR(10) NOT NULL DEFAULT 'off'")
        connection.execute(alter_table_query)
        print("Column `two_fa` added successfully.")
    else:
        print("Column `two_fa` already exists.")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

