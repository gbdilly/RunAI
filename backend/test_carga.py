# backend/test_carga.py
from datetime import date, timedelta

from carga import Treino, analisar_carga

HOJE = date(2026, 10, 22)


def padrao_estavel():
    """Corre 4 km nos dias 0, 2 e 4 de cada semana, durante 4 semanas.
    Cada semana tem a mesma carga, então não deve haver alertas."""
    return [Treino(HOJE - timedelta(days=d), 4.0) for d in range(28) if d % 7 in (0, 2, 4)]


def tipos(resultado):
    return [alerta["tipo"] for alerta in resultado["alertas"]]


def test_treino_estavel_nao_gera_alerta():
    resultado = analisar_carga(padrao_estavel(), HOJE)
    assert resultado["alertas"] == []
    assert resultado["acwr"] == 1.0


def test_crescimento_acima_de_10_por_cento_gera_alerta():
    treinos = padrao_estavel() + [Treino(HOJE - timedelta(days=1), 4.0)]
    resultado = analisar_carga(treinos, HOJE)
    assert "crescimento" in tipos(resultado)


def test_sem_treinos_nao_gera_alerta_e_acwr_e_nulo():
    resultado = analisar_carga([], HOJE)
    assert resultado["alertas"] == []
    assert resultado["acwr"] is None
    assert resultado["crescimento"] is None


def test_sete_dias_seguidos_gera_alerta_de_descanso():
    treinos = [Treino(HOJE - timedelta(days=d), 4.0) for d in range(7)]
    resultado = analisar_carga(treinos, HOJE)
    assert "descanso" in tipos(resultado)


def test_seis_dias_seguidos_nao_gera_alerta_de_descanso():
    treinos = [Treino(HOJE - timedelta(days=d), 4.0) for d in range(6)]
    resultado = analisar_carga(treinos, HOJE)
    assert "descanso" not in tipos(resultado)


def test_carga_recente_muito_acima_da_media_gera_alerta_de_acwr():
    # 10 km por dia nos últimos 7 dias, e nada antes
    treinos = [Treino(HOJE - timedelta(days=d), 10.0) for d in range(7)]
    resultado = analisar_carga(treinos, HOJE)
    assert "acwr" in tipos(resultado)