// mobile/src/constants/estilos.js
import { StyleSheet } from 'react-native';
import { COR } from './tema';

export const estilos = StyleSheet.create({
  app: { flex: 1, backgroundColor: COR.fundo, paddingTop: 56 },
  cabecalho: { paddingHorizontal: 24, paddingBottom: 4, alignItems: 'flex-start' },
  subCabecalho: { color: COR.suave, fontSize: 14, marginTop: -4 },
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },

  card: {
    backgroundColor: COR.superficie,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COR.borda,
  },
  cardDestaque: {
    backgroundColor: COR.amarelo,
    borderRadius: 20,
    padding: 20,
  },
  cardSessao: {
    backgroundColor: COR.superficie,
    borderRadius: 18,
    padding: 18,
    borderLeftWidth: 4,
  },

  rotulo: { color: COR.suave, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  rotuloEscuro: { color: COR.preto, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, opacity: 0.7 },
  rotuloPequeno: { color: COR.suave, fontSize: 13, marginTop: 10 },
  numeroGrande: { color: COR.preto, fontSize: 40, fontWeight: '800' },
  textoEscuro: { color: COR.preto, fontSize: 14, marginTop: 4 },
  numeroMedio: { color: COR.branco, fontSize: 26, fontWeight: '800', marginVertical: 4 },
  tituloCard: { color: COR.branco, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  textoSuave: { color: COR.suave, fontSize: 14, marginTop: 4, lineHeight: 20 },
  textoCorpo: { color: COR.branco, fontSize: 15, lineHeight: 22, marginTop: 4 },
  clima: { color: COR.suave, fontSize: 13, marginTop: 8 },
  secao: { color: COR.branco, fontSize: 20, fontWeight: '700', marginTop: 16 },

  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  destaqueKm: { color: COR.amarelo, fontSize: 18, fontWeight: '800' },
  iconeGrande: { fontSize: 24 },
  metricas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },

  etiqueta: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  etiquetaTexto: { color: COR.preto, fontSize: 12, fontWeight: '700' },

  alertaCard: { backgroundColor: COR.amarelo, borderRadius: 18, padding: 18 },
  alertaTitulo: { color: COR.preto, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  alertaTexto: { color: COR.preto, fontSize: 14, lineHeight: 20, marginTop: 2 },
  alertaAviso: { color: COR.preto, fontSize: 12, marginTop: 10, fontStyle: 'italic' },

  campo: {
    backgroundColor: COR.superficie,
    borderColor: COR.borda,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COR.branco,
    fontSize: 16,
    marginTop: 8,
  },

  botaoPrimario: {
    backgroundColor: COR.amarelo,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotaoPrimario: { color: COR.preto, fontSize: 16, fontWeight: '800' },
  botaoSecundario: {
    borderColor: COR.amarelo,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBotaoSecundario: { color: COR.amarelo, fontSize: 15, fontWeight: '700' },
  botaoSair: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  textoBotaoSair: { color: COR.suave, fontSize: 14 },
  pressionado: { opacity: 0.75 },

  banner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: COR.superficie2,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COR.amarelo,
  },
  bannerTexto: { color: COR.branco, fontSize: 14 },

  barraAbas: {
    flexDirection: 'row',
    backgroundColor: COR.superficie,
    borderTopWidth: 1,
    borderTopColor: COR.borda,
    paddingTop: 10,
    paddingBottom: 26,
  },
  aba: { flex: 1, alignItems: 'center', gap: 2 },
  abaIcone: { color: COR.suave, fontSize: 20 },
  abaTexto: { color: COR.suave, fontSize: 12 },
  abaAtiva: { color: COR.amarelo, fontWeight: '700' },
});