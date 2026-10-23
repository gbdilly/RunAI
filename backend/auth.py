# backend/auth.py
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from database import get_db
import models
import strava

import sincronizacao
from strava import StravaErro

router = APIRouter(prefix="/auth/strava", tags=["Autenticação Strava"])

# Guarda os "state" gerados no login para validar o retorno.
# Fica na memória: basta para desenvolvimento. Ao reiniciar o servidor, some.
_states_pendentes: set[str] = set()


@router.get("/login")
def login_strava():
    state = secrets.token_urlsafe(16)
    _states_pendentes.add(state)
    return RedirectResponse(strava.url_de_autorizacao(state))


@router.get("/callback")
async def callback_strava(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    # Se o corredor clicou em "Cancelar" no Strava, o Strava envia error=access_denied
    if error:
        raise HTTPException(status_code=400, detail="Você não autorizou o RunAI no Strava.")

    # Confere se o state foi gerado por nós (proteção contra CSRF)
    if not code or state not in _states_pendentes:
        raise HTTPException(status_code=400, detail="Requisição inválida ou expirada. Tente entrar de novo.")
    _states_pendentes.discard(state)

    dados = await strava.trocar_codigo_por_tokens(code)
    atleta = dados["athlete"]
    expira_em = datetime.fromtimestamp(dados["expires_at"], tz=timezone.utc)

    # Se o corredor já existe, atualiza. Se não, cria.
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

    # Importa as corridas logo após o login (História 1)
    try:
        importacao = await sincronizacao.importar_corridas(db, usuario)
    except StravaErro as erro:
        # O login deu certo mesmo se a importação falhar. Informamos o motivo.
        importacao = {"erro": erro.mensagem}

    return {
        "mensagem": "Login com Strava concluído",
        "user_id": usuario.id,
        "strava_athlete_id": usuario.strava_athlete_id,
        "nome": usuario.name,
        "importacao": importacao,
    }