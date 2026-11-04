// mobile/src/utils/datas.js
import { NOMES_DIAS, CODIGO_POR_INDICE } from '../constants/tema';

// Data local no formato 2026-10-23 (sem depender do fuso UTC)
export function isoLocal(d = new Date()) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// 2026-10-23 -> 23/10/2026
export function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// 2026-10-23 -> "Sex"
export function diaDaSemana(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const indice = new Date(ano, mes - 1, dia, 12).getDay();
  return NOMES_DIAS[CODIGO_POR_INDICE[indice]];
}

// 95 -> "1h35", 45 -> "45 min"
export function formatarDuracao(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

// Probabilidade de chuva -> ícone
export function iconeClima(prob) {
  if (prob == null) return '·';
  if (prob >= 60) return '🌧';
  if (prob >= 30) return '⛅';
  return '☀';
}