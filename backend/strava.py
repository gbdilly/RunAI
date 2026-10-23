# backend/strava.py
import os
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv

load_dotenv()

STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_API_URL = "https://www.strava.com/api/v3"

TIPOS_CORRIDA = {"Run", "TrailRun"}
POR_PAGINA = 200
MAX_PAGINAS = 10  # trava de segurança: 2.000 atividades no máximo


class StravaErro(Exception):
    """Erro de comunicação com o Strava, com mensagem pronta para o app."""

    def __init__(self, mensagem: str, status_code: int = 502):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code


def url_de_autorizacao(state: str) -> str:
    parametros = {
        "client_id": os.getenv("STRAVA_CLIENT_ID"),
        "redirect_uri": os.getenv("STRAVA_REDIRECT_URI"),
        "response_type": "code",
        "approval_prompt": "force",
        "scope": "read,activity:read_all",
        "state": state,
    }
    return f"{STRAVA_AUTHORIZE_URL}?{httpx.QueryParams(parametros)}"


async def trocar_codigo_por_tokens(code: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        resposta = await client.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": os.getenv("STRAVA_CLIENT_ID"),
                "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
                "code": code,
                "grant_type": "authorization_code",
            },
        )
    resposta.raise_for_status()
    return resposta.json()


async def renovar_token(refresh_token: str) -> dict:
    """Pede um access_token novo. O Strava também devolve um refresh_token novo."""
    async with httpx.AsyncClient(timeout=15) as client:
        resposta = await client.post(
            STRAVA_TOKEN_URL,
            data={
                "client_id": os.getenv("STRAVA_CLIENT_ID"),
                "client_secret": os.getenv("STRAVA_CLIENT_SECRET"),
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    if resposta.status_code != 200:
        raise StravaErro(
            "Não foi possível renovar o acesso ao Strava. Entre com o Strava de novo.",
            status_code=401,
        )
    return resposta.json()


async def listar_corridas(access_token: str, dias: int = 90) -> list[dict]:
    """Busca as corridas dos últimos `dias` dias, página por página."""
    depois = int((datetime.now(timezone.utc) - timedelta(days=dias)).timestamp())
    cabecalhos = {"Authorization": f"Bearer {access_token}"}
    corridas: list[dict] = []

    async with httpx.AsyncClient(timeout=20) as client:
        for pagina in range(1, MAX_PAGINAS + 1):
            try:
                resposta = await client.get(
                    f"{STRAVA_API_URL}/athlete/activities",
                    headers=cabecalhos,
                    params={"after": depois, "page": pagina, "per_page": POR_PAGINA},
                )
            except httpx.HTTPError as erro:
                raise StravaErro(f"Falha de rede ao falar com o Strava: {erro}") from erro

            if resposta.status_code == 429:
                raise StravaErro(
                    "Limite de requisições do Strava atingido. Tente de novo em 15 minutos.",
                    status_code=429,
                )
            if resposta.status_code == 401:
                raise StravaErro(
                    "O Strava recusou o acesso. Entre com o Strava de novo.",
                    status_code=401,
                )
            if resposta.status_code != 200:
                # Mostra o motivo que o próprio Strava informou (útil para depurar)
                print(f"[STRAVA] status={resposta.status_code} corpo={resposta.text}")
                raise StravaErro(
                    f"O Strava respondeu com erro {resposta.status_code}: {resposta.text}",
                    status_code=resposta.status_code if resposta.status_code == 403 else 502,
                )

            lote = resposta.json()
            corridas += [
                atividade
                for atividade in lote
                if (atividade.get("sport_type") or atividade.get("type")) in TIPOS_CORRIDA
            ]

            if len(lote) < POR_PAGINA:  # última página
                break

    return corridas