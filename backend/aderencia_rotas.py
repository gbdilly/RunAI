# backend/aderencia_rotas.py
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from aderencia import calcular_aderencia
from database import get_db
from sessao import usuario_atual

router = APIRouter(prefix="/aderencia", tags=["Aderência ao plano"])

FUSO_BRASIL = timezone(timedelta(hours=-3))


@router.get("/me")
def minha_aderencia(user_id: int = Depends(usuario_atual), db: Session = Depends(get_db)):
    hoje = datetime.now(FUSO_BRASIL).date()
    return calcular_aderencia(db, user_id, hoje)