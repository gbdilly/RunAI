// mobile/src/constants/tema.js

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://runai-backend-wsrr.onrender.com';

export const CABECALHOS = { 'ngrok-skip-browser-warning': 'true' };

export const INTERVALO_CONSULTA_MS = 5000;
export const MAXIMO_CONSULTAS = 120;
export const INTERVALO_SINCRONIZACAO_MS = 10 * 60 * 1000;

export const COR = {
  amarelo: '#FFD700',
  fundo: '#0A0A0A',
  superficie: '#161616',
  superficie2: '#202020',
  borda: '#2A2A2A',
  branco: '#FFFFFF',
  suave: '#9A9A9A',
  preto: '#000000',
};

export const TIPOS = {
  rodagem: { nome: 'Rodagem', cor: '#FFD700' },
  intervalado: { nome: 'Intervalado', cor: '#FF8A3D' },
  longao: { nome: 'Longão', cor: '#7CFFB2' },
  descanso: { nome: 'Descanso', cor: '#5C5C5C' },
};

export const OBJETIVOS = [
  { codigo: '5km', nome: '5 km' },
  { codigo: '10km', nome: '10 km' },
  { codigo: 'meia', nome: 'Meia' },
  { codigo: 'maratona', nome: 'Maratona' },
  { codigo: 'melhorar_tempo', nome: 'Melhorar tempo' },
];

export const DIAS = [
  { codigo: 'seg', nome: 'Seg' },
  { codigo: 'ter', nome: 'Ter' },
  { codigo: 'qua', nome: 'Qua' },
  { codigo: 'qui', nome: 'Qui' },
  { codigo: 'sex', nome: 'Sex' },
  { codigo: 'sab', nome: 'Sáb' },
  { codigo: 'dom', nome: 'Dom' },
];

export const NOMES_DIAS = Object.fromEntries(DIAS.map((d) => [d.codigo, d.nome]));

// Índice do dia da semana (0 = domingo) para o código usado pela API
export const CODIGO_POR_INDICE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const ABAS = [
  { codigo: 'inicio', nome: 'Início', icone: '⌂' },
  { codigo: 'treinos', nome: 'Treinos', icone: '↗' },
  { codigo: 'clima', nome: 'Clima', icone: '☁' },
  { codigo: 'plano', nome: 'Plano', icone: '✦' },
];