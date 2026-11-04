# backend/gemini.py
import asyncio
import os

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Gemini (principal)
MODELO = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
TIMEOUT_MS = 120_000
ESPERAS_S = [5, 15]  # novas tentativas no Gemini, com espera crescente

# Groq (reserva, API compatível com OpenAI)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELO = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_TIMEOUT_S = 90


class GeminiErro(Exception):
    def __init__(self, mensagem: str, status_code: int = 502):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code


def _temporario(erro: Exception) -> bool:
    texto = str(erro)
    return "503" in texto or "UNAVAILABLE" in texto or "429" in texto


async def _tentar_gemini(instrucao: str, conteudo: str) -> str:
    chave = os.getenv("GEMINI_API_KEY")
    if not chave:
        raise GeminiErro("Chave do Gemini não configurada no .env.", 500)

    cliente = genai.Client(
        api_key=chave,
        http_options=types.HttpOptions(timeout=TIMEOUT_MS),
    )
    configuracao = types.GenerateContentConfig(
        system_instruction=instrucao,
        response_mime_type="application/json",
        temperature=0.4,
    )

    ultimo_erro = None
    for tentativa in range(len(ESPERAS_S) + 1):
        try:
            resposta = await cliente.aio.models.generate_content(
                model=MODELO,
                contents=conteudo,
                config=configuracao,
            )
            if not resposta.text:
                raise GeminiErro("O Gemini devolveu uma resposta vazia.", 502)
            return resposta.text
        except GeminiErro:
            raise
        except Exception as erro:
            ultimo_erro = erro
            if not _temporario(erro) or tentativa == len(ESPERAS_S):
                break
            await asyncio.sleep(ESPERAS_S[tentativa])

    raise GeminiErro(f"Gemini indisponível: {ultimo_erro}", 503)


async def _tentar_groq(instrucao: str, conteudo: str) -> str:
    chave = os.getenv("GROQ_API_KEY")
    if not chave:
        raise GeminiErro("Groq não configurado (GROQ_API_KEY ausente).", 503)

    corpo = {
        "model": GROQ_MODELO,
        "messages": [
            {"role": "system", "content": instrucao},
            {"role": "user", "content": conteudo},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
    }
    try:
        async with httpx.AsyncClient(timeout=GROQ_TIMEOUT_S) as cliente:
            resposta = await cliente.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {chave}"},
                json=corpo,
            )
    except httpx.HTTPError as erro:
        raise GeminiErro(f"Falha de rede no Groq: {erro}", 503) from erro

    if resposta.status_code != 200:
        raise GeminiErro(f"Groq respondeu {resposta.status_code}: {resposta.text[:200]}", 503)

    texto = resposta.json()["choices"][0]["message"]["content"]
    if not texto:
        raise GeminiErro("O Groq devolveu uma resposta vazia.", 502)
    return texto


async def gerar_plano_json(instrucao: str, conteudo: str) -> str:
    """Tenta o Gemini; se estiver indisponível, usa o Groq como reserva."""
    try:
        return await _tentar_gemini(instrucao, conteudo)
    except GeminiErro as erro_gemini:
        if erro_gemini.status_code not in (500, 502, 503):
            raise
        try:
            return await _tentar_groq(instrucao, conteudo)
        except GeminiErro as erro_groq:
            raise GeminiErro(
                f"Nenhum provedor de IA disponível agora. Gemini: {erro_gemini.mensagem} | Groq: {erro_groq.mensagem}",
                503,
            )