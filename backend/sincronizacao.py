# backend/sincronizacao.py
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

import models
import strava

# Renova o token se ele vencer em menos de 5 minutos
MARGEM_RENOVACAO = timedelta(minutes=5)


async def garantir_token(db: Session, usuario: models.T_USERS) -> str:
    """Devolve um access_token válido, renovando-o se estiver perto de vencer."""
    agora = datetime.now(timezone.utc)
    if usuario.strava_token_expires_at and usuario.strava_token_expires_at > agora + MARGEM_RENOVACAO:
        return usuario.strava_access_token

    dados = await strava.renovar_token(usuario.strava_refresh_token)
    usuario.strava_access_token = dados["access_token"]
    usuario.strava_refresh_token = dados["refresh_token"]
    usuario.strava_token_expires_at = datetime.fromtimestamp(dados["expires_at"], tz=timezone.utc)
    db.commit()
    return usuario.strava_access_token


async def importar_corridas(db: Session, usuario: models.T_USERS) -> dict:
    """Importa as corridas dos últimos 90 dias, sem duplicar as que já existem."""
    token = await garantir_token(db, usuario)
    atividades = await strava.listar_corridas(token)

    # IDs já salvos para este corredor
    ids_salvos = {
        linha[0]
        for linha in db.query(models.T_WORKOUTS.strava_activity_id)
        .filter(models.T_WORKOUTS.user_id == usuario.id)
        .all()
    }

    novas = 0
    for atividade in atividades:
        if atividade["id"] in ids_salvos:
            continue

        db.add(
            models.T_WORKOUTS(
                user_id=usuario.id,
                strava_activity_id=atividade["id"],
                # start_date_local é a data no fuso do corredor, então a corrida cai no dia certo
                workout_date=date.fromisoformat(atividade["start_date_local"][:10]),
                distance_km=round(atividade["distance"] / 1000, 2),
                duration_min=round(atividade["moving_time"] / 60),
                elevation_m=atividade.get("total_elevation_gain"),
                avg_heartrate=round(atividade["average_heartrate"]) if atividade.get("average_heartrate") else None,
                notes=None,  # nome da atividade não é guardado (minimização de dados)
            )
        )
        ids_salvos.add(atividade["id"])
        novas += 1

    db.commit()

    return {
        "encontradas": len(atividades),
        "novas": novas,
        "ja_existiam": len(atividades) - novas,
    }