# backend/feedback.py
from datetime import date, timedelta

from sqlalchemy.orm import Session

import models

NIVEIS = ("facil", "ok", "dificil")


def registrar(db: Session, user_id: int, workout_id: int, nivel: str) -> None:
    """Cria ou atualiza a avaliação de uma corrida (uma por corrida)."""
    existente = (
        db.query(models.T_WORKOUT_FEEDBACK)
        .filter(models.T_WORKOUT_FEEDBACK.workout_id == workout_id)
        .first()
    )
    if existente is None:
        db.add(models.T_WORKOUT_FEEDBACK(user_id=user_id, workout_id=workout_id, nivel=nivel))
    else:
        existente.nivel = nivel
    db.commit()


def mapa_por_treino(db: Session, user_id: int, workout_ids: list[int]) -> dict[int, str]:
    """Devolve {workout_id: nivel} para as corridas informadas."""
    if not workout_ids:
        return {}
    linhas = (
        db.query(models.T_WORKOUT_FEEDBACK)
        .filter(
            models.T_WORKOUT_FEEDBACK.user_id == user_id,
            models.T_WORKOUT_FEEDBACK.workout_id.in_(workout_ids),
        )
        .all()
    )
    return {fb.workout_id: fb.nivel for fb in linhas}


def resumo_para_ia(db: Session, user_id: int, hoje: date, dias: int = 28) -> dict:
    """Resumo das avaliações recentes, pronto para o pacote do Gemini."""
    inicio = hoje - timedelta(days=dias)
    linhas = (
        db.query(models.T_WORKOUT_FEEDBACK, models.T_WORKOUTS)
        .join(models.T_WORKOUTS, models.T_WORKOUTS.id == models.T_WORKOUT_FEEDBACK.workout_id)
        .filter(
            models.T_WORKOUT_FEEDBACK.user_id == user_id,
            models.T_WORKOUTS.workout_date >= inicio,
            models.T_WORKOUTS.workout_date <= hoje,
        )
        .order_by(models.T_WORKOUTS.workout_date.desc())
        .all()
    )

    contagem = {nivel: 0 for nivel in NIVEIS}
    for fb, _ in linhas:
        contagem[fb.nivel] = contagem.get(fb.nivel, 0) + 1

    return {
        "periodo_dias": dias,
        "avaliacoes": len(linhas),
        "facil": contagem["facil"],
        "ok": contagem["ok"],
        "dificil": contagem["dificil"],
        "ultimas": [
            {"data": t.workout_date.isoformat(), "km": round(t.distance_km, 2), "nivel": fb.nivel}
            for fb, t in linhas[:6]
        ],
    }