# backend/gemini.py
import asyncio
import os

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Hub principal: OpenRouter (um endereço, vários modelos)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODELOS_OPENROUTER = [m.strip() for m in os.getenv("OPENROUTER_MODELS", "").split(",") if m.strip()]

# Gemini (segunda opção)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
TIMEOUT_GEMINI_MS = 120_000
ESPERAS_GEMINI_S = [5, 15]

# Groq (terceira opção)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODELO = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

TIMEOUT_HTTP_S = 90

MENSAGEM_INDISPONIVEL = (
    "O plano não foi gerado porque o serviço de geração está indisponível no momento. "
    "Tente de novo em alguns minutos."
)


class GeminiErro(Exception):
    def __init__(self, mensagem: str, status_code: int = 502):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code


def _temporario(erro: Exception) -> bool:
    texto = str(erro)
    return "503" in texto or "UNAVAILABLE" in texto or "429" in texto


async def _chamar_compativel_openai(
    url: str,
    chave: str,
    modelo: str,
    instrucao: str,
    conteudo: str,
    cabecalhos_extra: dict | None = None,
) -> str:
    """Chama qualquer API compatível com OpenAI (OpenRouter e Groq)."""
    corpo = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": instrucao},
            {"role": "user", "content": conteudo},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
    }
    cabecalhos = {"Authorization": f"Bearer {chave}", **(cabecalhos_extra or {})}

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_HTTP_S) as cliente:
            resposta = await cliente.post(url, headers=cabecalhos, json=corpo)
    except httpx.HTTPError as erro:
        raise GeminiErro(f"{modelo}: falha de rede ({erro})", 503) from erro

    if resposta.status_code != 200:
        raise GeminiErro(f"{modelo} respondeu {resposta.status_code}: {resposta.text[:150]}", 503)

    texto = resposta.json()["choices"][0]["message"]["content"]
    if not texto:
        raise GeminiErro(f"{modelo} devolveu resposta vazia.", 502)
    return texto


async def _tentar_gemini(instrucao: str, conteudo: str) -> str:
    chave = os.getenv("GEMINI_API_KEY")
    cliente = genai.Client(
        api_key=chave,
        http_options=types.HttpOptions(timeout=TIMEOUT_GEMINI_MS),
    )
    configuracao = types.GenerateContentConfig(
        system_instruction=instrucao,
        response_mime_type="application/json",
        temperature=0.4,
    )

    ultimo_erro = None
    for tentativa in range(len(ESPERAS_GEMINI_S) + 1):
        try:
            resposta = await cliente.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=conteudo,
                config=configuracao,
            )
            if not resposta.text:
                raise GeminiErro("Gemini devolveu resposta vazia.", 502)
            return resposta.text
        except GeminiErro:
            raise
        except Exception as erro:
            ultimo_erro = erro
            if not _temporario(erro) or tentativa == len(ESPERAS_GEMINI_S):
                break
            await asyncio.sleep(ESPERAS_GEMINI_S[tentativa])

    raise GeminiErro(f"Gemini indisponível: {ultimo_erro}", 503)


async def gerar_plano_json(instrucao: str, conteudo: str) -> str:
    """Tenta a hub (OpenRouter), depois o Gemini e por fim o Groq. Usa o primeiro que responder."""
    erros: list[str] = []

    chave_openrouter = os.getenv("OPENROUTER_API_KEY")
    if chave_openrouter:
        for modelo in MODELOS_OPENROUTER:
            try:
                return await _chamar_compativel_openai(
                    OPENROUTER_URL,
                    chave_openrouter,
                    modelo,
                    instrucao,
                    conteudo,
                    {"X-Title": "RunAI"},
                )
            except GeminiErro as erro:
                erros.append(erro.mensagem)

    if os.getenv("GEMINI_API_KEY"):
        try:
            return await _tentar_gemini(instrucao, conteudo)
        except GeminiErro as erro:
            erros.append(erro.mensagem)

    chave_groq = os.getenv("GROQ_API_KEY")
    if chave_groq:
        try:
            return await _chamar_compativel_openai(GROQ_URL, chave_groq, GROQ_MODELO, instrucao, conteudo)
        except GeminiErro as erro:
            erros.append(erro.mensagem)

    # Detalhes técnicos vão só para o log do Render; o usuário vê a mensagem simples
    print(f"[PLANO] nenhum serviço respondeu: {' | '.join(erros)[:800] or 'sem chaves configuradas'}", flush=True)
    raise GeminiErro(MENSAGEM_INDISPONIVEL, 503)