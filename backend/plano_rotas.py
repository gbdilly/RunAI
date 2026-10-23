# backend/plano_rotas.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sessao import usuario_atual

import plano
from clima import ClimaErro
from database import get_db
from gemini import GeminiErro
from plano import PlanoErro

router = APIRouter(prefix="/planos", tags=["Planos de treino"])


@router.post("/gerar")
async def gerar(user_id: int = Depends(usuario_atual)):
    try:
        return await plano.gerar_plano(db, user_id)
    except (PlanoErro, GeminiErro, ClimaErro) as erro:
        raise HTTPException(status_code=erro.status_code, detail=erro.mensagem)