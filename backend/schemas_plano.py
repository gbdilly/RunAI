# backend/schemas_plano.py
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

TipoTreino = Literal["rodagem", "intervalado", "longao", "descanso"]


class SessaoPlanejada(BaseModel):
    data: date
    tipo: TipoTreino
    distancia_km: float = Field(ge=0, le=60)
    descricao: str = Field(min_length=5, max_length=400)
    justificativa: str = Field(min_length=5, max_length=400)


class PlanoSemanal(BaseModel):
    resumo: str = Field(min_length=10, max_length=800)
    nivel_risco: Literal["baixo", "medio", "alto"]
    sessoes: list[SessaoPlanejada] = Field(min_length=1, max_length=7)