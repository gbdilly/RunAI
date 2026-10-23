# backend/gemini.py
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODELO = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
TIMEOUT_MS = 120_000  # 2 minutos para a resposta do Gemini


class GeminiErro(Exception):
    def __init__(self, mensagem: str, status_code: int = 502):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code


async def gerar_plano_json(instrucao: str, conteudo: str) -> str:
    """Envia o pacote ao Gemini e devolve o texto JSON bruto (validado depois)."""
    chave = os.getenv("GEMINI_API_KEY")
    if not chave:
        raise GeminiErro("Chave do Gemini não configurada no .env.", 500)

    cliente = genai.Client(
        api_key=chave,
        http_options=types.HttpOptions(timeout=TIMEOUT_MS),
    )
    try:
        resposta = await cliente.aio.models.generate_content(
            model=MODELO,
            contents=conteudo,
            config=types.GenerateContentConfig(
                system_instruction=instrucao,
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
    except Exception as erro:
        raise GeminiErro(f"Falha ao falar com o Gemini: {erro}", 502) from erro

    if not resposta.text:
        raise GeminiErro("O Gemini devolveu uma resposta vazia.", 502)
    return resposta.text