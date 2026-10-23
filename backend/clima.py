# backend/clima.py
import os
import time
import unicodedata
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv

load_dotenv()

GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
IBGE_MUNICIPIOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"

TEMPO_CACHE_PREVISAO_S = 30 * 60  # 30 minutos

_cache_previsao: dict[tuple[float, float], tuple[float, dict]] = {}
_municipios: list[dict] | None = None


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


def _normalizar(texto: str) -> str:
    """Remove acentos e deixa minúsculo, para 'Iv' encontrar 'Ivoti' e 'ivoti' igualmente."""
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return sem_acento.lower().strip()


def _sigla_uf(municipio: dict) -> str:
    """O IBGE mudou a estrutura do JSON em versões recentes. Esta função aceita as duas."""
    try:
        return municipio["microrregiao"]["mesorregiao"]["UF"]["sigla"]
    except KeyError:
        return municipio["regiao-imediata"]["regiao-intermediaria"]["UF"]["sigla"]


async def carregar_municipios() -> list[dict]:
    """Baixa a lista de municípios do IBGE uma vez e guarda na memória."""
    global _municipios
    if _municipios is not None:
        return _municipios

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resposta = await client.get(IBGE_MUNICIPIOS_URL, params={"orderBy": "nome"})
    except httpx.HTTPError as erro:
        raise ClimaErro(f"Não foi possível carregar a lista de cidades: {erro}", 502) from erro

    if resposta.status_code != 200:
        raise ClimaErro(f"A lista de cidades do IBGE respondeu com erro {resposta.status_code}.", 502)

    _municipios = [
        {
            "nome": m["nome"],
            "uf": _sigla_uf(m),
            "busca": _normalizar(m["nome"]),
        }
        for m in resposta.json()
    ]
    return _municipios


async def sugerir_cidades(texto: str, limite: int = 8) -> list[dict]:
    """Devolve as cidades cujo nome começa com o texto digitado."""
    termo = _normalizar(texto)
    if len(termo) < 2:
        return []

    municipios = await carregar_municipios()
    encontradas = [m for m in municipios if m["busca"].startswith(termo)][:limite]

    return [
        {"nome": m["nome"], "uf": m["uf"], "cidade": f"{m['nome']}, {m['uf']}"}
        for m in encontradas
    ]


async def buscar_coordenadas(cidade: str) -> dict:
    """Converte 'Ivoti, RS' em latitude e longitude pelo OpenWeather."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resposta = await client.get(
                GEO_URL,
                params={"q": f"{cidade}, BR", "limit": 1, "appid": _chave()},
            )
    except httpx.HTTPError as erro:
        raise ClimaErro(f"Falha ao falar com o OpenWeather: {erro}", 502) from erro

    if resposta.status_code == 401:
        raise ClimaErro(
            "Chave do OpenWeather recusada. Se a chave é nova, pode levar algumas horas para ativar.",
            503,
        )
    if resposta.status_code != 200:
        raise ClimaErro(f"O OpenWeather respondeu com erro {resposta.status_code}.")

    dados = resposta.json()
    if not dados:
        raise ClimaErro(f"Cidade '{cidade}' não encontrada.", 404)

    local = dados[0]
    return {
        "nome": local["name"],
        "estado": local.get("state"),
        "latitude": local["lat"],
        "longitude": local["lon"],
    }


async def _buscar_previsao(latitude: float, longitude: float) -> dict:
    """Chama o OpenWeather e agrupa a previsão de 3 em 3 horas por dia, no fuso da cidade."""
    try:
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
    except httpx.HTTPError as erro:
        raise ClimaErro(f"Falha ao falar com o OpenWeather: {erro}", 502) from erro

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


async def previsao_5_dias(latitude: float, longitude: float) -> dict:
    """Usa a previsão guardada por 30 minutos para não chamar o OpenWeather a cada toque."""
    chave = (round(latitude, 2), round(longitude, 2))
    agora = time.time()

    if chave in _cache_previsao:
        instante, dados = _cache_previsao[chave]
        if agora - instante < TEMPO_CACHE_PREVISAO_S:
            return dados

    dados = await _buscar_previsao(latitude, longitude)
    _cache_previsao[chave] = (agora, dados)
    return dados