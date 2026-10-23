# backend/preferencias.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from schemas_preferencias import PreferenciasIn

from sessao import usuario_atual

router = APIRouter(prefix="/preferencias", tags=["Preferências de treino"])


def _garantir_corredor(db: Session, user_id: int) -> None:
    if db.get(models.T_USERS, user_id) is None:
        raise HTTPException(status_code=404, detail="Corredor não encontrado.")


def _para_resposta(pref: models.T_PREFERENCES) -> dict:
    return {
        "user_id": pref.user_id,
        "objetivo": pref.goal_type,
        "data_alvo": pref.goal_date,
        "dias_por_semana": pref.days_per_week,
        "dias_disponiveis": pref.preferred_days.split(",") if pref.preferred_days else [],
    }


@router.get("/me")
def ver_preferencias(user_id: int = Depends(usuario_atual)):
    _garantir_corredor(db, user_id)
    pref = db.query(models.T_PREFERENCES).filter(models.T_PREFERENCES.user_id == user_id).first()
    if pref is None:
        raise HTTPException(status_code=404, detail="Preferências ainda não cadastradas.")
    return _para_resposta(pref)


@router.put("/me")
def salvar_preferencias(dados: PreferenciasIn, user_id: int = Depends(usuario_atual), db: Session = Depends(get_db)):
    _garantir_corredor(db, user_id)

    pref = db.query(models.T_PREFERENCES).filter(models.T_PREFERENCES.user_id == user_id).first()
    if pref is None:
        pref = models.T_PREFERENCES(user_id=user_id)
        db.add(pref)

    pref.goal_type = dados.objetivo
    pref.goal_date = dados.data_alvo
    pref.days_per_week = dados.dias_por_semana
    pref.preferred_days = ",".join(dados.dias_disponiveis)

    db.commit()
    db.refresh(pref)
    return _para_resposta(pref)