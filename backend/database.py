import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Lê o arquivo .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# O "engine" é a conexão com o Supabase
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Cada requisição usa uma "sessão" para conversar com o banco
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Classe base de onde todas as tabelas herdam
Base = declarative_base()


def get_db():
    """Abre uma sessão com o banco e a fecha ao terminar a requisição."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()