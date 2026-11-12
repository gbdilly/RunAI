// mobile/src/telas/TelaAderencia.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COR } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { chamarApi } from '../api/config';
import { diaDaSemana, formatarData } from '../utils/datas';

const STATUS = {
  cumprida: { nome: 'Cumprida', cor: '#7CFFB2' },
  parcial: { nome: 'Parcial', cor: '#FF8A3D' },
  nao_feita: { nome: 'Não feita', cor: '#5C5C5C' },
};

export default function TelaAderencia({ token, onFechar }) {
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
      if (status === 200) setDados(corpo);
      else setErro(`Erro ${status}: ${corpo.detail || 'não foi possível carregar.'}`);
    } catch (err) {
      setErro(`Falha de conexão: ${err.message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        <Text style={styles.titulo}>Aderência ao plano</Text>
        <Pressable onPress={onFechar} style={styles.fechar}>
          <Text style={styles.fecharTexto}>Fechar ✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={e.conteudo}>
        {carregando ? <ActivityIndicator color={COR.amarelo} /> : null}

        {erro ? <Text style={e.textoSuave}>{erro}</Text> : null}

        {dados && !dados.tem_dados ? (
          <View style={e.card}>
            <Text style={e.textoCorpo}>{dados.mensagem}</Text>
          </View>
        ) : null}

        {dados && dados.tem_dados ? (
          <>
            <View style={e.cardDestaque}>
              <Text style={e.rotuloEscuro}>Sessões cumpridas</Text>
              <Text style={e.numeroGrande}>{dados.percentual_cumpridas}%</Text>
              <Text style={e.textoEscuro}>
                {dados.cumpridas} de {dados.sessoes_passadas} sessões passadas
              </Text>
            </View>

            <View style={e.card}>
              <Text style={e.rotulo}>Semanas dentro do planejado</Text>
              {dados.semanas_total > 0 ? (
                <Text style={e.tituloCard}>
                  {dados.semanas_dentro} de {dados.semanas_total}
                </Text>
              ) : (
                <Text style={e.textoSuave}>Ainda não há semanas completas para medir.</Text>
              )}
            </View>

            <Text style={e.secao}>Sessões</Text>

            {dados.sessoes.map((s) => {
              const st = STATUS[s.status];
              return (
                <View key={s.data} style={e.card}>
                  <View style={e.linhaTopo}>
                    <Text style={e.tituloCard}>
                      {diaDaSemana(s.data)} · {formatarData(s.data)}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: st.cor }]}>
                      <Text style={styles.pillTexto}>{st.nome}</Text>
                    </View>
                  </View>
                  <Text style={e.textoSuave}>
                    Planejado: {s.distancia_planejada_km} km ·{' '}
                    Feito: {s.distancia_real_km != null ? `${s.distancia_real_km} km` : '—'}
                  </Text>
                </View>
              );
            })}

            <Text style={e.textoSuave}>
              Cumprida: entre 80% e 120% da distância planejada, no mesmo dia ou no seguinte.
              Dias de descanso e a semana atual não entram na conta.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo, paddingTop: 56 },
  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  titulo: { color: COR.branco, fontSize: 22, fontWeight: '800' },
  fechar: {
    borderWidth: 1,
    borderColor: COR.amarelo,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  fecharTexto: { color: COR.amarelo, fontSize: 14, fontWeight: '700' },
  pill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillTexto: { color: COR.preto, fontSize: 12, fontWeight: '700' },
});