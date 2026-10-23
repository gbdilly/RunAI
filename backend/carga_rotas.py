# backend/carga_rotas.py
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import carga
import models
from database import get_db

from sessao import usuario_atual

router = APIRouter(prefix="/carga", tags=["Carga e alertas"])


@router.get("/me")
def analisar(user_id: int = Depends(usuario_atual)):
    if db.get(models.T_USERS, user_id) is None:
        raise HTTPException(status_code=404, detail="Corredor não encontrado.")

    linhas = db.query(models.T_WORKOUTS).filter(models.T_WORKOUTS.user_id == user_id).all()
    treinos = [carga.Treino(data=linha.workout_date, km=linha.distance_km) for linha in linhas]

    return carga.analisar_carga(treinos, date.today())