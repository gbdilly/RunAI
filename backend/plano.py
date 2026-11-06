# backend/plano.py
import json
from datetime import date, timedelta

from sqlalchemy.orm import Session

import carga
import clima
import gemini
import models
from schemas_plano import PlanoSemanal
from schemas_preferencias import DIAS_VALIDOS

LIMITE_CHUVA_LONGAO = 50  # % : acima disso, o treino longo não pode cair no dia
TENTATIVAS = 2


class PlanoErro(Exception):
    def __init__(self, mensagem: str, status_code: int = 400):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code


INSTRUCAO = """Você é um treinador de corrida experiente, que escreve treinos para iniciantes e intermediários, em português do Brasil.

Seu objetivo é montar um plano de treino para os próximos 7 dias que seja executável pelo corredor sem instruções extras. Cada treino deve ser um roteiro detalhado, e não uma frase genérica.

REGRAS OBRIGATÓRIAS
- Use somente os dias listados em 'proximos_7_dias'. Não crie sessões em outros dias.
- Coloque o treino longo ('longao') no dia com menor chance de chuva, se houver previsão.
- Se 'alertas_de_carga' não estiver vazio, reduza o volume e explique isso na justificativa.
- Use as faixas de ritmo do pacote ('ritmo'). Não invente outras faixas.
- Se houver 'correcao_solicitada', corrija exatamente o problema apontado.

COMO ESCREVER CADA SESSÃO
- 'descricao' deve ser um roteiro com, nesta ordem:
  1. Aquecimento: duração (em minutos ou km) e intensidade, por exemplo "10 min de caminhada rápida seguidos de 5 min de trote leve".
  2. Parte principal: o que fazer, com tempo ou distância e ritmo. Exemplo: "20 min de corrida contínua em ritmo confortável, sem parar". Para intervalados, indique repetições, distância ou tempo de cada tiro e a recuperação.
  3. Desaquecimento: duração e intensidade.
  4. Orientação de execução: como deve ser a sensação (por exemplo, "você deve conseguir falar frases curtas") e um sinal de alerta para parar (dor aguda, tontura).
- Se usar um termo técnico (como intervalado, fartlek ou regenerativo), explique em poucas palavras na mesma frase.
- Some a distância total da sessão e confira que ela bate com 'distancia_km'.

COMO JUSTIFICAR CADA SESSÃO
- 'justificativa' deve citar pelo menos um dado concreto do pacote: volume da semana, corrida mais longa recente, dias seguidos treinando, chance de chuva ou alerta de carga.
- Explique por que o volume e a intensidade foram escolhidos para aquele dia.

FORMATO DE SAÍDA
Responda somente com JSON neste formato:
{
  "resumo": "texto curto sobre a semana, com a lógica da progressão",
  "nivel_risco": "baixo" ou "medio" ou "alto",
  "sessoes": [
    {
      "data": "AAAA-MM-DD",
      "tipo": "rodagem" ou "intervalado" ou "longao" ou "descanso",
      "distancia_km": numero,
      "descricao": "roteiro detalhado: aquecimento, parte principal, desaquecimento e orientação de execução",
      "justificativa": "por que este dia e este volume, citando dados do pacote"
    }
  ]
}
"""


async def _montar_contexto(db: Session, user_id: int):
    usuario = db.get(models.T_USERS, user_id)
    if usuario is None:
        raise PlanoErro("Corredor não encontrado.", 404)

    pref = db.query(models.T_PREFERENCES).filter(models.T_PREFERENCES.user_id == user_id).first()
    if pref is None or not pref.preferred_days or not pref.goal_type:
        raise PlanoErro("Cadastre objetivo e dias disponíveis em /preferencias primeiro.")

    if usuario.latitude is None:
        raise PlanoErro("Cadastre a cidade primeiro em PUT /clima/cidade.")

    dias_disponiveis = pref.preferred_days.split(",")

    previsao = await clima.previsao_5_dias(usuario.latitude, usuario.longitude)
    hoje = date.fromisoformat(previsao["hoje"])
    previsao_por_data = {dia["data"]: dia for dia in previsao["dias"]}

    janela = []
    for deslocamento in range(7):
        dia = hoje + timedelta(days=deslocamento)
        codigo = DIAS_VALIDOS[dia.weekday()]
        if codigo not in dias_disponiveis:
            continue
        previsto = previsao_por_data.get(dia.isoformat())
        janela.append({
            "data": dia.isoformat(),
            "dia_semana": codigo,
            "prob_chuva_pct": previsto["prob_chuva_pct"] if previsto else None,
            "temp_media_c": previsto["temp_media_c"] if previsto else None,
        })

    linhas = db.query(models.T_WORKOUTS).filter(models.T_WORKOUTS.user_id == user_id).all()
    treinos = [carga.Treino(data=linha.workout_date, km=linha.distance_km) for linha in linhas]
    analise = carga.analisar_carga(treinos, hoje)
    alertas = [alerta["mensagem"] for alerta in analise["alertas"]]

    historico = []
    for n in range(4):
        fim = hoje - timedelta(days=7 * n)
        inicio = fim - timedelta(days=6)
        do_periodo = [t for t in treinos if inicio <= t.data <= fim]
        historico.append({
            "semana_inicio": inicio.isoformat(),
            "corridas": len(do_periodo),
            "distancia_total_km": round(sum(t.km for t in do_periodo), 2),
        })

    pacote = {
        "objetivo": pref.goal_type,
        "data_alvo": pref.goal_date.isoformat() if pref.goal_date else None,
        "dias_por_semana": pref.days_per_week,
        "proximos_7_dias": janela,
        "historico_semanas": historico,
        "carga": {
            chave: analise[chave]
            for chave in (
                "carga_aguda_km", "carga_aguda_anterior_km", "carga_cronica_media_km",
                "crescimento", "acwr", "dias_seguidos_treinando",
            )
        },
        "alertas_de_carga": alertas,
    }
    return janela, pacote, alertas, hoje


def _validar(plano: PlanoSemanal, janela: list[dict]) -> None:
    """Regras que o Python confere depois da resposta do Gemini."""
    por_data = {dia["data"]: dia for dia in janela}
    vistas: set[str] = set()

    for sessao in plano.sessoes:
        chave = sessao.data.isoformat()
        if chave in vistas:
            raise ValueError(f"A data {chave} aparece em mais de uma sessão.")
        vistas.add(chave)

        info = por_data.get(chave)
        if info is None:
            raise ValueError(f"A sessão de {chave} cai fora dos dias disponíveis ou da janela de 7 dias.")

        if (
            sessao.tipo == "longao"
            and info["prob_chuva_pct"] is not None
            and info["prob_chuva_pct"] >= LIMITE_CHUVA_LONGAO
        ):
            raise ValueError(
                f"O treino longo de {chave} tem {info['prob_chuva_pct']}% de chance de chuva. "
                "Escolha outro dia da janela."
            )


async def gerar_plano(db: Session, user_id: int) -> dict:
    janela, pacote, alertas, hoje = await _montar_contexto(db, user_id)

    plano: PlanoSemanal | None = None
    correcao: str | None = None

    for _ in range(TENTATIVAS):
        if correcao:
            pacote["correcao_solicitada"] = correcao

        texto = await gemini.gerar_plano_json(INSTRUCAO, json.dumps(pacote, ensure_ascii=False))

        try:
            plano = PlanoSemanal.model_validate_json(texto)
            _validar(plano, janela)
            break
        except ValueError as erro:  # ValidationError também é ValueError
            correcao = str(erro)[:300]
            plano = None

    if plano is None:
        raise PlanoErro("O Gemini não gerou um plano válido. Tente de novo.", 502)

    nivel = plano.nivel_risco
    if alertas and nivel == "baixo":
        nivel = "medio"

    por_data = {dia["data"]: dia for dia in janela}

    registro = models.T_TRAINING_PLANS(
        user_id=user_id,
        week_start=hoje,
        summary=plano.resumo,
        risk_level=nivel,
        alerts="\n".join(alertas) if alertas else None,
    )

    sessoes_resposta = []
    for sessao in plano.sessoes:
        info = por_data[sessao.data.isoformat()]
        if info["prob_chuva_pct"] is not None:
            nota_clima = f"Chuva {info['prob_chuva_pct']}%, {info['temp_media_c']} °C"
        else:
            nota_clima = "Sem previsão para este dia"

        registro.sessions.append(
            models.T_PLANNED_SESSIONS(
                user_id=user_id,
                session_date=sessao.data,
                session_type=sessao.tipo,
                distance_km=sessao.distancia_km,
                description=f"{sessao.descricao} | {sessao.justificativa}",
                rain_probability=info["prob_chuva_pct"],
                weather_note=nota_clima,
            )
        )
        sessoes_resposta.append({
            "data": sessao.data.isoformat(),
            "tipo": sessao.tipo,
            "distancia_km": sessao.distancia_km,
            "descricao": sessao.descricao,
            "justificativa": sessao.justificativa,
            "clima": nota_clima,
        })

    db.add(registro)
    db.commit()
    db.refresh(registro)

    return {
        "mensagem": "Plano gerado",
        "plano_id": registro.id,
        "resumo": registro.summary,
        "nivel_risco": registro.risk_level,
        "alertas": alertas,
        "sessoes": sessoes_resposta,
    }