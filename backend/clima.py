# backend/clima.py
import os
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv

load_dotenv()

GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


class ClimaErro(Exception):
    def __init__(self, mensagem: str, status_code: int = 502):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code


def _chave() -> str:
    chave = os.getenv("OPENWEATHER_API_KEY")
    if not chave:
        raise ClimaErro("Chave do OpenWeather não configurada no .env.", 500)
    return chave


async def buscar_coordenadas(cidade: str) -> dict:
    """Converte o nome da cidade (ex.: 'Ivoti, RS') em latitude e longitude."""
    async with httpx.AsyncClient(timeout=15) as client:
        resposta = await client.get(
            GEO_URL,
            params={"q": f"{cidade}, BR", "limit": 1, "appid": _chave()},
        )

    if resposta.status_code == 401:
        raise ClimaErro(
            "Chave do OpenWeather recusada. Se a chave é nova, pode levar algumas horas para ativar.",
            503,
        )
    if resposta.status_code != 200:
        raise ClimaErro(f"O OpenWeather respondeu com erro {resposta.status_code}.")

    dados = resposta.json()
    if not dados:
        raise ClimaErro(
            f"Cidade '{cidade}' não encontrada. Tente incluir o estado, por exemplo: Ivoti, RS.",
            404,
        )

    local = dados[0]
    return {
        "nome": local["name"],
        "estado": local.get("state"),
        "latitude": local["lat"],
        "longitude": local["lon"],
    }


async def previsao_5_dias(latitude: float, longitude: float) -> dict:
    """Agrupa a previsão de 3 em 3 horas por dia, no fuso horário da cidade."""
    async with httpx.AsyncClient(timeout=15) as client:
        resposta = await client.get(
            FORECAST_URL,
            params={
                "lat": latitude,
                "lon": longitude,
                "appid": _chave(),
                "units": "metric",
                "lang": "pt_br",
            },
        )

    if resposta.status_code != 200:
        raise ClimaErro(f"Não foi possível obter a previsão (erro {resposta.status_code}).")

    dados = resposta.json()
    deslocamento = timedelta(seconds=dados["city"]["timezone"])
    hoje = (datetime.now(timezone.utc) + deslocamento).date()

    agrupado: dict[str, dict] = {}
    for bloco in dados["list"]:
        dia = (datetime.fromtimestamp(bloco["dt"], tz=timezone.utc) + deslocamento).date()
        grupo = agrupado.setdefault(dia.isoformat(), {"temps": [], "chuva": [], "descricoes": []})
        grupo["temps"].append(bloco["main"]["temp"])
        grupo["chuva"].append(bloco.get("pop", 0))
        grupo["descricoes"].append(bloco["weather"][0]["description"])

    dias = []
    for data, grupo in sorted(agrupado.items()):
        dias.append({
            "data": data,
            "temp_media_c": round(sum(grupo["temps"]) / len(grupo["temps"]), 1),
            "prob_chuva_pct": round(max(grupo["chuva"]) * 100),
            "descricao": max(set(grupo["descricoes"]), key=grupo["descricoes"].count),
        })

    return {"hoje": hoje.isoformat(), "dias": dias}