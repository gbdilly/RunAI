# backend/aderencia.py
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy.orm import Session

import models

# Cumprida: distância real entre 80% e 120% da planejada
TOLERANCIA_MIN = 0.8
TOLERANCIA_MAX = 1.2
# A corrida pode ser no dia da sessão ou no dia seguinte
JANELA_DIAS = 1
# Semana conta como "dentro do planejado" se pelo menos 80% das sessões foram cumpridas
LIMITE_SEMANA = 0.8


def _inicio_semana(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _resultado_vazio(mensagem: str) -> dict:
    return {
        "tem_dados": False,
        "mensagem": mensagem,
        "sessoes_passadas": 0,
        "cumpridas": 0,
        "parciais": 0,
        "nao_feitas": 0,
        "percentual_cumpridas": None,
        "semanas_total": 0,
        "semanas_dentro": 0,
        "sessoes": [],
    }


def calcular_aderencia(db: Session, user_id: int, hoje: date) -> dict:
    sessoes = (
        db.query(models.T_PLANNED_SESSIONS)
        .filter(
            models.T_PLANNED_SESSIONS.user_id == user_id,
            models.T_PLANNED_SESSIONS.session_date < hoje,
            models.T_PLANNED_SESSIONS.session_type != "descanso",
        )
        .order_by(models.T_PLANNED_SESSIONS.session_date)
        .all()
    )
    sessoes = [s for s in sessoes if (s.distance_km or 0) > 0]

    if not sessoes:
        return _resultado_vazio("Ainda não há sessões passadas para medir. Volte depois de treinar.")

    datas = [s.session_date for s in sessoes]
    treinos = (
        db.query(models.T_WORKOUTS)
        .filter(
            models.T_WORKOUTS.user_id == user_id,
            models.T_WORKOUTS.workout_date >= min(datas),
            models.T_WORKOUTS.workout_date <= max(datas) + timedelta(days=JANELA_DIAS),
        )
        .all()
    )

    usados: set[int] = set()
    itens: list[tuple[date, dict]] = []

    for s in sessoes:
        planejado = float(s.distance_km)
        # Corrida ainda não usada por outra sessão, no dia da sessão ou no seguinte
        candidatos = [
            t for t in treinos
            if t.id not in usados
            and 0 <= (t.workout_date - s.session_date).days <= JANELA_DIAS
        ]
        escolhido = min(candidatos, key=lambda t: abs(t.distance_km - planejado), default=None)

        if escolhido is None:
            status, real = "nao_feita", None
        else:
            usados.add(escolhido.id)
            real = round(escolhido.distance_km, 2)
            razao = escolhido.distance_km / planejado
            status = "cumprida" if TOLERANCIA_MIN <= razao <= TOLERANCIA_MAX else "parcial"

        itens.append((s.session_date, {
            "data": s.session_date.isoformat(),
            "tipo": s.session_type,
            "distancia_planejada_km": round(planejado, 2),
            "distancia_real_km": real,
            "status": status,
        }))

    total = len(itens)
    cumpridas = sum(1 for _, i in itens if i["status"] == "cumprida")
    parciais = sum(1 for _, i in itens if i["status"] == "parcial")
    nao_feitas = sum(1 for _, i in itens if i["status"] == "nao_feita")

    por_semana: dict[date, list[dict]] = defaultdict(list)
    for data_sessao, item in itens:
        por_semana[_inicio_semana(data_sessao)].append(item)

    semanas_total = 0
    semanas_dentro = 0
    for inicio, grupo in por_semana.items():
        # Só conta semanas já encerradas, para não julgar uma semana em andamento
        if inicio + timedelta(days=6) >= hoje:
            continue
        semanas_total += 1
        feitas = sum(1 for i in grupo if i["status"] == "cumprida")
        if feitas / len(grupo) >= LIMITE_SEMANA:
            semanas_dentro += 1

    return {
        "tem_dados": True,
        "mensagem": "",
        "sessoes_passadas": total,
        "cumpridas": cumpridas,
        "parciais": parciais,
        "nao_feitas": nao_feitas,
        "percentual_cumpridas": round(cumpridas / total * 100),
        "semanas_total": semanas_total,
        "semanas_dentro": semanas_dentro,
        "sessoes": [item for _, item in itens],
    }