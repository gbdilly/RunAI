# backend/carga.py
from dataclasses import dataclass
from datetime import date, timedelta

import config_carga as cfg


@dataclass(frozen=True)
class Treino:
    data: date
    km: float


def soma_no_periodo(treinos: list[Treino], inicio: date, fim: date) -> float:
    return sum(t.km for t in treinos if inicio <= t.data <= fim)


def sequencia_atual(treinos: list[Treino], hoje: date) -> int:
    """Quantos dias seguidos com corrida terminam hoje.
    Se hoje não teve corrida, conta a partir de ontem."""
    datas = {t.data for t in treinos}
    dia = hoje if hoje in datas else hoje - timedelta(days=1)
    contagem = 0
    while dia in datas:
        contagem += 1
        dia -= timedelta(days=1)
    return contagem


def analisar_carga(treinos: list[Treino], hoje: date) -> dict:
    janela_a = cfg.JANELA_AGUDA_DIAS
    janela_c = cfg.JANELA_CRONICA_DIAS

    aguda = soma_no_periodo(treinos, hoje - timedelta(days=janela_a - 1), hoje)
    aguda_anterior = soma_no_periodo(
        treinos,
        hoje - timedelta(days=2 * janela_a - 1),
        hoje - timedelta(days=janela_a),
    )
    cronica = soma_no_periodo(treinos, hoje - timedelta(days=janela_c - 1), hoje) / (janela_c / janela_a)

    acwr = round(aguda / cronica, 2) if cronica > 0 else None
    crescimento = round((aguda - aguda_anterior) / aguda_anterior, 3) if aguda_anterior > 0 else None
    sequencia = sequencia_atual(treinos, hoje)

    alertas: list[dict] = []

    if crescimento is not None and crescimento > cfg.LIMITE_CRESCIMENTO_SEMANAL:
        alertas.append({
            "tipo": "crescimento",
            "mensagem": f"A carga da última semana subiu {round(crescimento * 100)}%. "
                        "Reduza o volume para evitar lesões.",
        })

    if acwr is not None and acwr > cfg.LIMITE_ACWR:
        alertas.append({
            "tipo": "acwr",
            "mensagem": f"A carga recente está {acwr} vezes acima da sua média. "
                        "Considere uma semana mais leve.",
        })

    if sequencia > cfg.MAX_DIAS_SEM_DESCANSO:
        alertas.append({
            "tipo": "descanso",
            "mensagem": f"Você está há {sequencia} dias seguidos treinando. "
                        "Inclua um dia de descanso.",
        })

    return {
        "carga_aguda_km": round(aguda, 2),
        "carga_aguda_anterior_km": round(aguda_anterior, 2),
        "carga_cronica_media_km": round(cronica, 2),
        "crescimento": crescimento,
        "acwr": acwr,
        "dias_seguidos_treinando": sequencia,
        "alertas": alertas,
        "aviso": "Este resultado não substitui acompanhamento médico.",
    }