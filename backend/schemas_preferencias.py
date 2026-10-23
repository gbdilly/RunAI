# backend/schemas_preferencias.py
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

DIAS_VALIDOS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]

Objetivo = Literal["5km", "10km", "meia", "maratona", "melhorar_tempo"]


class PreferenciasIn(BaseModel):
    objetivo: Objetivo
    data_alvo: date | None = None
    dias_por_semana: int = Field(ge=1, le=7)
    dias_disponiveis: list[str] = Field(min_length=1, max_length=7)

    @field_validator("dias_disponiveis")
    @classmethod
    def validar_dias(cls, dias: list[str]) -> list[str]:
        limpos: list[str] = []
        for dia in dias:
            dia = dia.strip().lower()
            if dia not in DIAS_VALIDOS:
                raise ValueError(f"Dia inválido: '{dia}'. Use um de: {', '.join(DIAS_VALIDOS)}")
            if dia not in limpos:
                limpos.append(dia)
        # Ordena pela semana (seg primeiro)
        return sorted(limpos, key=DIAS_VALIDOS.index)

    @model_validator(mode="after")
    def checar_consistencia(self):
        if self.dias_por_semana > len(self.dias_disponiveis):
            raise ValueError(
                "Dias por semana não pode ser maior que a quantidade de dias disponíveis."
            )
        if self.data_alvo is not None and self.data_alvo <= date.today():
            raise ValueError("A data-alvo precisa ser uma data futura.")
        return self