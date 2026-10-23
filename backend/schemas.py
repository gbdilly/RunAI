# backend/schemas.py
from pydantic import BaseModel, EmailStr, Field, field_validator


class CadastroIn(BaseModel):
    nome: str = Field(min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=72)

    @field_validator("senha")
    @classmethod
    def senha_cabe_no_bcrypt(cls, valor: str) -> str:
        # O limite do bcrypt é em bytes, não em caracteres (acentos ocupam 2 bytes)
        if len(valor.encode("utf-8")) > 72:
            raise ValueError("A senha pode ter no máximo 72 bytes.")
        return valor


class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=72)