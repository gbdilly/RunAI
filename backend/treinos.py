# backend/treinos.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import sincronizacao
from strava import StravaErro

from sessao import usuario_atual

router = APIRouter(prefix="/treinos", tags=["Treinos"])


@router.post("/sincronizar")
async def sincronizar(user_id: int = Depends(usuario_atual)):
    usuario = db.get(models.T_USERS, user_id)
    if usuario is None or usuario.strava_refresh_token is None:
        raise HTTPException(status_code=404, detail="Corredor sem conexão com o Strava.")

    try:
        resultado = await sincronizacao.importar_corridas(db, usuario)
    except StravaErro as erro:
        raise HTTPException(status_code=erro.status_code, detail=erro.mensagem)

    return {"mensagem": "Sincronização concluída", **resultado}


@router.get("/me")
def listar_treinos(user_id: int = Depends(usuario_atual)):
    treinos = (
        db.query(models.T_WORKOUTS)
        .filter(models.T_WORKOUTS.user_id == user_id)
        .order_by(models.T_WORKOUTS.workout_date.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "data": t.workout_date,
            "distancia_km": t.distance_km,
            "duracao_min": t.duration_min,
            "elevacao_m": t.elevation_m,
            "fc_media": t.avg_heartrate,
        }
        for t in treinos
    ]