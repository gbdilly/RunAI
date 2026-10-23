from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models  # importa as tabelas para o SQLAlchemy conhecê-las

# Cria no Supabase as tabelas que ainda não existem
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RunAI API")

from auth import router as auth_router
app.include_router(auth_router)

from auth_email import router as auth_email_router
app.include_router(auth_email_router)

from treinos import router as treinos_router
app.include_router(treinos_router)

from preferencias import router as preferencias_router
app.include_router(preferencias_router)

from clima_rotas import router as clima_router
app.include_router(clima_router)

from carga_rotas import router as carga_router
app.include_router(carga_router)

from plano_rotas import router as plano_router
app.include_router(plano_router)

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