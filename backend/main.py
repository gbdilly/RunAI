from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models  # importa as tabelas para o SQLAlchemy conhecê-las

# Cria no Supabase as tabelas que ainda não existem
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RunAI API")

# Permite que o app (celular ou emulador) chame a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def raiz():
    return {"mensagem": "API RunAI online 🏃"}


@app.get("/teste-banco")
def teste_banco(db: Session = Depends(get_db)):
    """Confirma que a API consegue conversar com o Supabase."""
    db.execute(text("SELECT 1"))
    return {"banco": "conectado"}