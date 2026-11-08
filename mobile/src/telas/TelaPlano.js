// mobile/src/telas/TelaPlano.js
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import TextoGlossario from '../components/TextoGlossario';
import { COR, TIPOS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { diaDaSemana, formatarData } from '../utils/datas';

const ROTULOS = 'Aquecimento|Parte principal|Desaquecimento|Orientação de execução';

// Separa "Aquecimento: ... Parte principal: ..." em blocos.
// Se o texto não tiver os rótulos (plano antigo), devolve null.
function separarRoteiro(texto) {
  const partes = texto.split(new RegExp(`(${ROTULOS}):\\s*`, 'i'));
  if (partes.length < 3) return null;

  const blocos = [];
  for (let i = 1; i < partes.length; i += 2) {
    blocos.push({ rotulo: partes[i], conteudo: (partes[i + 1] || '').trim() });
  }
  return blocos;
}

// Primeira frase da parte principal, usada como resumo no cartão
function resumoDoTreino(texto, blocos) {
  let base = texto;
  if (blocos) {
    const principal = blocos.find((b) => /parte principal/i.test(b.rotulo));
    base = principal ? principal.conteudo : blocos[0]?.conteudo ?? texto;
  }
  const primeira = base.trim().split(/(?<=[.!?])\s/)[0];
  return primeira || base;
}

// No descanso, mostra só a frase principal, sem rótulos
function textoDescanso(texto) {
  const semRotulos = texto.split(new RegExp(`(${ROTULOS}):`, 'i'))[0];
  const primeiraFrase = semRotulos.trim().split(/(?<=[.!?])\s/)[0];
  return primeiraFrase || texto;
}

function BlocoRoteiro({ rotulo, conteudo }) {
  return (
    <View style={styles.bloco}>
      <Text style={styles.blocoRotulo}>{rotulo}</Text>
      <TextoGlossario texto={conteudo} estilo={styles.blocoTexto} />
    </View>
  );
}

function CardSessao({ s }) {
  const [aberto, setAberto] = useState(false);
  const tipo = TIPOS[s.tipo] ?? TIPOS.rodagem;
  const ehDescanso = s.tipo === 'descanso';
  const blocos = ehDescanso ? null : separarRoteiro(s.descricao);
  const resumo = ehDescanso ? textoDescanso(s.descricao) : resumoDoTreino(s.descricao, blocos);

  const cabecalho = (
    <View style={e.linhaTopo}>
      <Text style={e.tituloCard}>
        {diaDaSemana(s.data)} · {formatarData(s.data)}
      </Text>
      <View style={styles.direita}>
        <View style={[e.etiqueta, { backgroundColor: tipo.cor }]}>
          <Text style={e.etiquetaTexto}>{tipo.nome}</Text>
        </View>
        {!ehDescanso ? <Text style={styles.seta}>{aberto ? '▲' : '▼'}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={[e.cardSessao, { borderLeftColor: tipo.cor }]}>
      {ehDescanso ? (
        cabecalho
      ) : (
        <Pressable onPress={() => setAberto(!aberto)}>{cabecalho}</Pressable>
      )}

      {!ehDescanso ? (
        <>
          <Text style={e.numeroMedio}>{s.distancia_km} km</Text>
          <TextoGlossario texto={resumo} estilo={e.textoCorpo} />
        </>
      ) : (
        <TextoGlossario texto={resumo} estilo={e.textoCorpo} />
      )}

      {aberto && !ehDescanso ? (
        <View>
          {blocos ? (
            blocos.map((b, i) => <BlocoRoteiro key={i} rotulo={b.rotulo} conteudo={b.conteudo} />)
          ) : (
            <TextoGlossario texto={s.descricao} estilo={e.textoCorpo} />
          )}
          <TextoGlossario texto={s.justificativa} estilo={e.textoSuave} />
        </View>
      ) : null}

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
            <TextoGlossario texto={plano.resumo} estilo={e.textoCorpo} />
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
  direita: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seta: { color: COR.amarelo, fontSize: 12 },
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