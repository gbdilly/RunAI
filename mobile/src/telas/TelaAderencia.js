// mobile/src/telas/TelaAderencia.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Aviso from '../components/Aviso';
import { COR } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { chamarApi } from '../api/config';
import { diaDaSemana, formatarData } from '../utils/datas';

const STATUS = {
  seguiu: { nome: 'Seguiu o plano', cor: '#7CFFB2' },
  parcial: { nome: 'Parcial', cor: '#FF8A3D' },
  livre: { nome: 'Fora do plano', cor: '#5C5C5C' },
};

export default function TelaAderencia({ token }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setCarregando(true);
    setErro('');
    try {
      const { status, dados: corpo } = await chamarApi('/aderencia/me', token);
      if (status !== 200) {
        setErro(corpo?.detail || `O servidor respondeu com erro ${status}.`);
        return;
      }
      // Garante o formato esperado, mesmo se o servidor ainda estiver em versão antiga
      if (!corpo || typeof corpo !== 'object' || !('tem_dados' in corpo)) {
        setErro('O servidor ainda está com uma versão antiga. Aguarde o deploy e tente de novo.');
        return;
      }
      setDados({ ...corpo, corridas: Array.isArray(corpo.corridas) ? corpo.corridas : [] });
    } catch {
      setErro('Verifique sua conexão com a internet e tente de novo.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Aderência ao plano</Text>

      {carregando ? <ActivityIndicator color={COR.amarelo} /> : null}

      {erro ? (
        <Aviso tipo="erro" titulo="Não foi possível carregar" texto={erro} onTentarNovamente={carregar} />
      ) : null}

      {dados && !dados.tem_dados ? (
        <View style={e.card}>
          <Text style={e.textoCorpo}>{dados.mensagem}</Text>
        </View>
      ) : null}

      {dados && dados.tem_dados ? (
        <>
          <View style={e.cardDestaque}>
            <Text style={e.rotuloEscuro}>Corridas que seguiram o plano</Text>
            <Text style={e.numeroGrande}>{dados.percentual_seguiram ?? 0}%</Text>
            <Text style={e.textoEscuro}>
              {dados.seguiram ?? 0} de {dados.corridas_total ?? 0} corridas nos últimos {dados.janela_dias ?? 28} dias
            </Text>
          </View>

          <View style={styles.resumo}>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoNumero}>{dados.seguiram ?? 0}</Text>
              <Text style={e.textoSuave}>seguiram</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoNumero}>{dados.parciais ?? 0}</Text>
              <Text style={e.textoSuave}>parciais</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoNumero}>{dados.livres ?? 0}</Text>
              <Text style={e.textoSuave}>fora do plano</Text>
            </View>
          </View>

          <Text style={e.secao}>Suas corridas</Text>

          {dados.corridas.map((c, i) => {
            const st = STATUS[c.status] ?? STATUS.livre;
            return (
              <View key={`${c.data}-${i}`} style={e.card}>
                <View style={e.linhaTopo}>
                  <Text style={e.tituloCard}>
                    {diaDaSemana(c.data)} · {formatarData(c.data)}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: st.cor }]}>
                    <Text style={styles.pillTexto}>{st.nome}</Text>
                  </View>
                </View>
                <Text style={e.textoSuave}>
                  Feito: {c.distancia_real_km} km
                  {c.distancia_planejada_km != null ? ` · Planejado: ${c.distancia_planejada_km} km` : ''}
                </Text>
              </View>
            );
          })}

          <Text style={e.textoSuave}>
            Seguiu o plano: entre 80% e 120% da distância planejada, no mesmo dia ou no seguinte.
            Corridas fora do plano não contam contra você.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  titulo: { color: COR.branco, fontSize: 22, fontWeight: '800', marginTop: 8 },
  resumo: { flexDirection: 'row', gap: 8 },
  resumoItem: {
    flex: 1,
    backgroundColor: COR.superficie,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COR.borda,
    alignItems: 'center',
  },
  resumoNumero: { color: COR.amarelo, fontSize: 22, fontWeight: '800' },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillTexto: { color: COR.preto, fontSize: 12, fontWeight: '700' },
});