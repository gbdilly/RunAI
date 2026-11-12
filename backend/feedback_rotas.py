# backend/feedback_rotas.py
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import feedback
import models
from database import get_db
from sessao import usuario_atual

router = APIRouter(prefix="/feedback", tags=["Feedback pós-treino"])


class FeedbackIn(BaseModel):
    nivel: Literal["facil", "ok", "dificil"]


@router.put("/{workout_id}")
def avaliar_treino(
    workout_id: int,
    dados: FeedbackIn,
    user_id: int = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    treino = db.get(models.T_WORKOUTS, workout_id)
    if treino is None or treino.user_id != user_id:
        raise HTTPException(status_code=404, detail="Corrida não encontrada.")

    feedback.registrar(db, user_id, workout_id, dados.nivel)
    return {"mensagem": "Avaliação salva", "workout_id": workout_id, "nivel": dados.nivel}