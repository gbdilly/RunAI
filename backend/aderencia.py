# backend/aderencia.py
from datetime import date, timedelta

from sqlalchemy.orm import Session

import feedback
import models

# Seguiu o plano: distância real entre 80% e 120% da planejada
TOLERANCIA_MIN = 0.8
TOLERANCIA_MAX = 1.2
# A corrida pode ser no dia da sessão ou no dia seguinte
JANELA_DIAS = 1
# Período analisado
JANELA_RETROATIVA_DIAS = 28


def _sessoes_por_data(db: Session, user_id: int, inicio: date, hoje: date) -> dict:
    """Uma sessão por data: a do plano mais recente que cobre aquele dia."""
    sessoes = (
        db.query(models.T_PLANNED_SESSIONS)
        .filter(
            models.T_PLANNED_SESSIONS.user_id == user_id,
            models.T_PLANNED_SESSIONS.session_date >= inicio - timedelta(days=JANELA_DIAS),
            models.T_PLANNED_SESSIONS.session_date <= hoje,
            models.T_PLANNED_SESSIONS.session_type != "descanso",
        )
        .all()
    )

    por_data: dict[date, models.T_PLANNED_SESSIONS] = {}
    for s in sessoes:
        if (s.distance_km or 0) <= 0:
            continue
        atual = por_data.get(s.session_date)
        if atual is None or s.plan_id > atual.plan_id:
            por_data[s.session_date] = s
    return por_data


def _vazio(mensagem: str) -> dict:
    return {
        "tem_dados": False,
        "mensagem": mensagem,
        "janela_dias": JANELA_RETROATIVA_DIAS,
        "corridas_total": 0,
        "seguiram": 0,
        "parciais": 0,
        "livres": 0,
        "percentual_seguiram": None,
        "corridas": [],
    }


def calcular_aderencia(db: Session, user_id: int, hoje: date) -> dict:
    inicio = hoje - timedelta(days=JANELA_RETROATIVA_DIAS)

    treinos = (
        db.query(models.T_WORKOUTS)
        .filter(
            models.T_WORKOUTS.user_id == user_id,
            models.T_WORKOUTS.workout_date >= inicio,
            models.T_WORKOUTS.workout_date <= hoje,
        )
        .order_by(models.T_WORKOUTS.workout_date.desc())
        .all()
    )

    if not treinos:
        return _vazio(f"Nenhuma corrida nos últimos {JANELA_RETROATIVA_DIAS} dias para comparar com o plano.")

    por_data = _sessoes_por_data(db, user_id, inicio, hoje)
    avaliacoes = feedback.mapa_por_treino(db, user_id, [t.id for t in treinos])

    corridas = []
    seguiram = 0
    parciais = 0
    livres = 0

    for t in treinos:
        candidatas = [
            por_data[d]
            for d in (t.workout_date, t.workout_date - timedelta(days=JANELA_DIAS))
            if d in por_data
        ]

        if not candidatas:
            status = "livre"
            planejado = None
            livres += 1
        else:
            planejado = round(float(candidatas[0].distance_km), 2)
            razao = t.distance_km / planejado
            if TOLERANCIA_MIN <= razao <= TOLERANCIA_MAX:
                status = "seguiu"
                seguiram += 1
            else:
                status = "parcial"
                parciais += 1

        corridas.append({
            "id": t.id,
            "data": t.workout_date.isoformat(),
            "distancia_real_km": round(t.distance_km, 2),
            "distancia_planejada_km": planejado,
            "status": status,
            "feedback": avaliacoes.get(t.id),
        })

    total = len(treinos)

    return {
        "tem_dados": True,
        "mensagem": "",
        "janela_dias": JANELA_RETROATIVA_DIAS,
        "corridas_total": total,
        "seguiram": seguiram,
        "parciais": parciais,
        "livres": livres,
        "percentual_seguiram": round(seguiram / total * 100),
        "corridas": corridas,
    }