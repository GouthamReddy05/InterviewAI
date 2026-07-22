from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from core.config import DATABASE_URL


try:
    engine = create_engine(DATABASE_URL)
except Exception as e:
    print(f"[WARN] Failed to connect to DATABASE_URL ({e}); falling back to SQLite in-memory")
    engine = create_engine('sqlite:///:memory:', echo=False)



SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
