# backend/clima_rotas.py
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
import clima
import models
from clima import ClimaErro
from schemas_preferencias import DIAS_VALIDOS

from sessao import usuario_atual

router = APIRouter(prefix="/clima", tags=["Clima"])


class CidadeIn(BaseModel):
    cidade: str = Field(min_length=3, max_length=100, examples=["Ivoti, RS"])


@router.put("/cidade")
@router.put("/cidade")
async def definir_cidade(dados: CidadeIn, user_id: int = Depends(usuario_atual), db: Session = Depends(get_db)):
    usuario = db.get(models.T_USERS, user_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Corredor não encontrado.")

    try:
        local = await clima.buscar_coordenadas(dados.cidade)
    except ClimaErro as erro:
        raise HTTPException(status_code=erro.status_code, detail=erro.mensagem)

    usuario.city = local["nome"] if not local["estado"] else f"{local['nome']}, {local['estado']}"
    usuario.latitude = local["latitude"]
    usuario.longitude = local["longitude"]
    db.commit()

    return {
        "mensagem": "Cidade salva",
        "cidade": usuario.city,
        "latitude": usuario.latitude,
        "longitude": usuario.longitude,
    }


@router.get("/me")
async def clima_dos_treinos(user_id: int = Depends(usuario_atual)):
    usuario = db.get(models.T_USERS, user_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Corredor não encontrado.")
    if usuario.latitude is None:
        raise HTTPException(status_code=400, detail="Cadastre a cidade primeiro em PUT /clima/cidade/{user_id}.")

    pref = db.query(models.T_PREFERENCES).filter(models.T_PREFERENCES.user_id == user_id).first()
    if pref is None or not pref.preferred_days:
        raise HTTPException(status_code=400, detail="Cadastre os dias disponíveis em /preferencias primeiro.")
    dias_do_corredor = pref.preferred_days.split(",")

    try:
        previsao = await clima.previsao_5_dias(usuario.latitude, usuario.longitude)
    except ClimaErro as erro:
        raise HTTPException(status_code=erro.status_code, detail=erro.mensagem)

    por_data = {dia["data"]: dia for dia in previsao["dias"]}
    hoje = date.fromisoformat(previsao["hoje"])

    resultado = []
    # Olha os próximos 7 dias, mas só mostra os que o corredor marcou como disponíveis
    for deslocamento in range(7):
        dia = hoje + timedelta(days=deslocamento)
        codigo = DIAS_VALIDOS[dia.weekday()]
        if codigo not in dias_do_corredor:
            continue

        previsto = por_data.get(dia.isoformat())
        if previsto:
            resultado.append({
                "data": dia.isoformat(),
                "dia_semana": codigo,
                "status": "previsto",
                "prob_chuva_pct": previsto["prob_chuva_pct"],
                "temp_media_c": previsto["temp_media_c"],
                "descricao": previsto["descricao"],
            })
        else:
            resultado.append({
                "data": dia.isoformat(),
                "dia_semana": codigo,
                "status": "sem_previsao",
            })

    return {"cidade": usuario.city, "dias": resultado}