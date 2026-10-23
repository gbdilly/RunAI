# backend/auth.py
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
import models
import sincronizacao
import strava
from sessao import criar_token
from strava import StravaErro

router = APIRouter(prefix="/auth/strava", tags=["Autenticação Strava"])

# state -> destino (endereço do app). Fica na memória: basta para desenvolvimento.
_states_pendentes: dict[str, str] = {}

# Esquemas aceitos para o retorno: runai:// (produção) e exp:// (Expo Go)
ESQUEMAS_PERMITIDOS = ("runai://", "exp://")


@router.get("/login")
def login_strava(destino: str | None = Query(default=None)):
    if destino is not None and not destino.startswith(ESQUEMAS_PERMITIDOS):
        raise HTTPException(status_code=400, detail="Destino de retorno não permitido.")

    state = secrets.token_urlsafe(16)
    _states_pendentes[state] = destino or ""
    return RedirectResponse(strava.url_de_autorizacao(state))


@router.get("/callback")
async def callback_strava(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    destino = _states_pendentes.pop(state, None) if state else None

    if error:
        if destino:
            return RedirectResponse(f"{destino}?{urlencode({'erro': 'negado'})}")
        raise HTTPException(status_code=400, detail="Você não autorizou o RunAI no Strava.")

    if not code or destino is None:
        raise HTTPException(status_code=400, detail="Requisição inválida ou expirada. Tente entrar de novo.")

    dados = await strava.trocar_codigo_por_tokens(code)
    atleta = dados["athlete"]
    expira_em = datetime.fromtimestamp(dados["expires_at"], tz=timezone.utc)

    usuario = (
        db.query(models.T_USERS)
        .filter(models.T_USERS.strava_athlete_id == atleta["id"])
        .first()
    )
    if usuario is None:
        usuario = models.T_USERS(strava_athlete_id=atleta["id"])
        db.add(usuario)

    usuario.name = f"{atleta.get('firstname', '')} {atleta.get('lastname', '')}".strip()
    usuario.strava_access_token = dados["access_token"]
    usuario.strava_refresh_token = dados["refresh_token"]
    usuario.strava_token_expires_at = expira_em

    db.commit()
    db.refresh(usuario)

    token = criar_token(usuario.id)

    # Com destino (app), devolve o usuário para o app com o token
    if destino:
        parametros = urlencode({"token": token, "user_id": usuario.id, "nome": usuario.name})
        return RedirectResponse(f"{destino}?{parametros}")

    # Sem destino (teste no navegador), mostra o JSON com o token
    return {
        "mensagem": "Login com Strava concluído",
        "user_id": usuario.id,
        "token": token,
        "strava_athlete_id": usuario.strava_athlete_id,
        "nome": usuario.name,
    }