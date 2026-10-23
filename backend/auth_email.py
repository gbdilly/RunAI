# backend/auth_email.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
from schemas import CadastroIn, LoginIn
from security import gerar_hash, conferir_senha

router = APIRouter(prefix="/auth", tags=["Autenticação por e-mail"])


@router.post("/cadastro", status_code=status.HTTP_201_CREATED)
def cadastro(dados: CadastroIn, db: Session = Depends(get_db)):
    email = dados.email.lower()

    ja_existe = db.query(models.T_USERS).filter(models.T_USERS.email == email).first()
    if ja_existe:
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail.")

    usuario = models.T_USERS(
        name=dados.nome.strip(),
        email=email,
        password_hash=gerar_hash(dados.senha),
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    return {
        "mensagem": "Cadastro concluído",
        "user_id": usuario.id,
        "nome": usuario.name,
    }


@router.post("/login")
def login(dados: LoginIn, db: Session = Depends(get_db)):
    usuario = (
        db.query(models.T_USERS)
        .filter(models.T_USERS.email == dados.email.lower())
        .first()
    )

    # Usuário que entrou só pelo Strava não tem password_hash, então também cai aqui
    senha_ok = (
        usuario is not None
        and usuario.password_hash is not None
        and conferir_senha(dados.senha, usuario.password_hash)
    )
    if not senha_ok:
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    return {
        "mensagem": "Login concluído",
        "user_id": usuario.id,
        "nome": usuario.name,
    }