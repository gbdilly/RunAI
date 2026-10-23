# backend/plano_rotas.py
from fastapi import APIRouter, BackgroundTasks, Depends

import plano
from clima import ClimaErro
from database import SessionLocal
from gemini import GeminiErro
from plano import PlanoErro
from sessao import usuario_atual

router = APIRouter(prefix="/planos", tags=["Planos de treino"])

# Estado de cada geração, por corredor. Fica na memória: basta para a faculdade.
# Some se o servidor reiniciar.
_jobs: dict[int, dict] = {}


async def _executar(user_id: int) -> None:
    """Roda a geração em segundo plano, com sessão própria do banco."""
    db = SessionLocal()
    try:
        resultado = await plano.gerar_plano(db, user_id)
        _jobs[user_id] = {"estado": "pronto", "resultado": resultado}
    except (PlanoErro, GeminiErro, ClimaErro) as erro:
        _jobs[user_id] = {"estado": "erro", "mensagem": erro.mensagem}
    except Exception as erro:
        _jobs[user_id] = {"estado": "erro", "mensagem": f"Erro inesperado: {erro}"}
    finally:
        db.close()


@router.post("/gerar", status_code=202)
async def gerar(background: BackgroundTasks, user_id: int = Depends(usuario_atual)):
    """Inicia a geração e responde na hora. O app acompanha em GET /planos/me."""
    if _jobs.get(user_id, {}).get("estado") == "gerando":
        return {"estado": "gerando", "mensagem": "Já existe um plano sendo gerado."}

    _jobs[user_id] = {"estado": "gerando"}
    background.add_task(_executar, user_id)
    return {"estado": "gerando", "mensagem": "Gerando plano..."}


@router.get("/me")
def ver_plano(user_id: int = Depends(usuario_atual)):
    """Estados: nenhum, gerando, pronto (com 'resultado') ou erro (com 'mensagem')."""
    job = _jobs.get(user_id)
    if job is None:
        return {"estado": "nenhum"}
    return job