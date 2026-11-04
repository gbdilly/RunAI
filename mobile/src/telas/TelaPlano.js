// mobile/src/telas/TelaPlano.js
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { COR, TIPOS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { diaDaSemana, formatarData } from '../utils/datas';

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

          {plano.sessoes.map((s) => {
            const tipo = TIPOS[s.tipo] ?? TIPOS.rodagem;
            return (
              <View key={s.data} style={[e.cardSessao, { borderLeftColor: tipo.cor }]}>
                <View style={e.linhaTopo}>
                  <Text style={e.tituloCard}>
                    {diaDaSemana(s.data)} · {formatarData(s.data)}
                  </Text>
                  <View style={[e.etiqueta, { backgroundColor: tipo.cor }]}>
                    <Text style={e.etiquetaTexto}>{tipo.nome}</Text>
                  </View>
                </View>
                {s.tipo !== 'descanso' ? <Text style={e.numeroMedio}>{s.distancia_km} km</Text> : null}
                <Text style={e.textoCorpo}>{s.descricao}</Text>
                <Text style={e.textoSuave}>{s.justificativa}</Text>
                <Text style={e.clima}>{s.clima}</Text>
              </View>
            );
          })}
        </>
      ) : (
        <Text style={e.textoSuave}>
          Seu plano aparece aqui. Ele usa seu histórico, sua rotina e a previsão do tempo.
        </Text>
      )}
    </>
  );
}