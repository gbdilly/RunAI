# backend/sessao.py
import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

ALGORITMO = "HS256"
VALIDADE = timedelta(days=7)
_bearer = HTTPBearer()


def criar_token(user_id: int) -> str:
    """Gera um token assinado que identifica o corredor por 7 dias."""
    agora = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": agora, "exp": agora + VALIDADE}
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm=ALGORITMO)


def usuario_atual(credenciais: HTTPAuthorizationCredentials = Depends(_bearer)) -> int:
    """Lê o token da requisição e devolve o user_id. Usado como dependência nas rotas."""
    try:
        payload = jwt.decode(
            credenciais.credentials,
            os.getenv("JWT_SECRET"),
            algorithms=[ALGORITMO],
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Entre de novo.")
    return int(payload["sub"])