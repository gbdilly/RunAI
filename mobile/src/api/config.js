// mobile/src/api/config.js
import { API_URL, CABECALHOS } from '../constants/tema';

// Lê a resposta como texto e converte para JSON, sem quebrar em erros em texto puro
export async function lerResposta(resposta) {
  const texto = await resposta.text();
  try {
    return { status: resposta.status, dados: JSON.parse(texto) };
  } catch {
    return {
      status: resposta.status,
      dados: { detail: `Resposta inesperada (${resposta.status}): ${texto.slice(0, 120)}` },
    };
  }
}

// Chama a API com o token do corredor
export async function chamarApi(caminho, token, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: {
      ...CABECALHOS,
      Authorization: `Bearer ${token}`,
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return lerResposta(resposta);
}