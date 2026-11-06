// mobile/src/telas/TelaPlano.js
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COR, TIPOS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { diaDaSemana, formatarData } from '../utils/datas';

// Separa "Aquecimento: ... Parte principal: ..." em blocos.
// Se o texto não tiver os rótulos (plano antigo), devolve null e mostra como texto corrido.
function separarRoteiro(texto) {
  const partes = texto.split(/(Aquecimento|Parte principal|Desaquecimento|Orientação de execução):\s*/i);
  if (partes.length < 3) return null;

  const blocos = [];
  for (let i = 1; i < partes.length; i += 2) {
    blocos.push({ rotulo: partes[i], conteudo: (partes[i + 1] || '').trim() });
  }
  return blocos;
}

function BlocoRoteiro({ rotulo, conteudo }) {
  return (
    <View style={styles.bloco}>
      <Text style={styles.blocoRotulo}>{rotulo}</Text>
      <Text style={styles.blocoTexto}>{conteudo}</Text>
    </View>
  );
}

function CardSessao({ s }) {
  const tipo = TIPOS[s.tipo] ?? TIPOS.rodagem;
  const ehDescanso = s.tipo === 'descanso';
  const blocos = ehDescanso ? null : separarRoteiro(s.descricao);

  return (
    <View style={[e.cardSessao, { borderLeftColor: tipo.cor }]}>
      <View style={e.linhaTopo}>
        <Text style={e.tituloCard}>
          {diaDaSemana(s.data)} · {formatarData(s.data)}
        </Text>
        <View style={[e.etiqueta, { backgroundColor: tipo.cor }]}>
          <Text style={e.etiquetaTexto}>{tipo.nome}</Text>
        </View>
      </View>

      {!ehDescanso ? <Text style={e.numeroMedio}>{s.distancia_km} km</Text> : null}

      {ehDescanso ? (
        <Text style={e.textoCorpo}>{s.descricao}</Text>
      ) : blocos ? (
        blocos.map((b, i) => <BlocoRoteiro key={i} rotulo={b.rotulo} conteudo={b.conteudo} />)
      ) : (
        <Text style={e.textoCorpo}>{s.descricao}</Text>
      )}

      <Text style={e.textoSuave}>{s.justificativa}</Text>
      <Text style={e.clima}>{s.clima}</Text>
    </View>
  );
}

export default function TelaPlano({ plano, gerandoPlano, onGerarPlano }) {
  return (
    <>
      <Pressable
        style={({ pressed }) => [e.botaoPrimario, (pressed || gerandoPlano) && e.pressionado]}
        onPress={onGerarPlano}
        disabled={gerandoPlano}
      >
        {gerandoPlano ? (
          <ActivityIndicator color={COR.preto} />
        ) : (
          <Text style={e.textoBotaoPrimario}>{plano ? 'Gerar novo plano' : 'Gerar plano da semana'}</Text>
        )}
      </Pressable>

      {plano ? (
        <>
          {plano.alertas.length > 0 ? (
            <View style={e.alertaCard}>
              <Text style={e.alertaTitulo}>⚠ Atenção à carga de treino</Text>
              {plano.alertas.map((alerta, i) => (
                <Text key={i} style={e.alertaTexto}>• {alerta}</Text>
              ))}
              <Text style={e.alertaAviso}>Este aviso não substitui acompanhamento médico.</Text>
            </View>
          ) : null}

          <View style={e.card}>
            <Text style={e.rotulo}>Risco {plano.nivel_risco}</Text>
            <Text style={e.textoCorpo}>{plano.resumo}</Text>
          </View>

          {plano.sessoes.map((s) => (
            <CardSessao key={s.data} s={s} />
          ))}
        </>
      ) : (
        <Text style={e.textoSuave}>
          Seu plano aparece aqui. Ele usa seu histórico, sua rotina e a previsão do tempo.
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bloco: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: COR.borda,
  },
  blocoRotulo: {
    color: COR.amarelo,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  blocoTexto: { color: COR.branco, fontSize: 14, lineHeight: 20, marginTop: 2 },
});