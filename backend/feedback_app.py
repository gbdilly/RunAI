# backend/feedback_app.py
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
from database import get_db
from sessao import usuario_atual

router = APIRouter(prefix="/feedback-app", tags=["Feedback do app"])


class AvaliacaoIn(BaseModel):
    nota: Literal[1, 2, 3, 4, 5]
    comentario: str | None = Field(default=None, max_length=500)


@router.get("/me")
def ver_minha_avaliacao(user_id: int = Depends(usuario_atual), db: Session = Depends(get_db)):
    existente = db.query(models.T_APP_FEEDBACK).filter(models.T_APP_FEEDBACK.user_id == user_id).first()
    if existente is None:
        return {"enviado": False}
    return {"enviado": True, "nota": existente.nota}


@router.post("", status_code=201)
def enviar_avaliacao(dados: AvaliacaoIn, user_id: int = Depends(usuario_atual), db: Session = Depends(get_db)):
    existente = db.query(models.T_APP_FEEDBACK).filter(models.T_APP_FEEDBACK.user_id == user_id).first()
    if existente is not None:
        raise HTTPException(status_code=409, detail="Você já enviou sua avaliação. Obrigado!")

    comentario = (dados.comentario or "").strip() or None
    db.add(models.T_APP_FEEDBACK(user_id=user_id, nota=dados.nota, comentario=comentario))
    db.commit()
    return {"mensagem": "Obrigado pelo feedback"}