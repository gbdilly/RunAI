// mobile/src/telas/TelaInicio.js
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Trilha from '../components/Trilha';
import { COR, TIPOS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { formatarData } from '../utils/datas';

const DICAS = {
  Rotina: 'Escolha seu objetivo, os dias em que pode treinar e quantos treinos quer por semana.',
  Cidade: 'Informe sua cidade para a IA considerar a previsão do tempo.',
  Treinos: 'Suas corridas do Strava são atualizadas sozinhas ao abrir o app.',
  Plano: 'Gere o plano da semana. A IA leva alguns minutos para montar.',
};

export default function TelaInicio({
  kmSemana,
  qtdTreinos7,
  proximaSessao,
  resumoRotina,
  rotinaFeita,
  cidadeFeita,
  treinosFeitos,
  planoFeito,
  onAbrirRotina,
  onIrClima,
  onIrTreinos,
  onIrPlano,
  onAbrirAderencia,
  onSair,
}) {
  const passos = [
    { rotulo: 'Rotina', feito: rotinaFeita, acao: onAbrirRotina },
    { rotulo: 'Cidade', feito: cidadeFeita, acao: onIrClima },
    { rotulo: 'Treinos', feito: treinosFeitos, acao: onIrTreinos },
    { rotulo: 'Plano', feito: planoFeito, acao: onIrPlano },
  ];
  const proximo = passos.find((p) => !p.feito);

  return (
    <>
      {proximo ? (
        <View style={e.card}>
          <Text style={e.rotulo}>Comece por aqui</Text>
          <Trilha passos={passos} />
          <Text style={e.tituloCard}>Próximo passo: {proximo.rotulo}</Text>
          <Text style={e.textoSuave}>{DICAS[proximo.rotulo]}</Text>
          <Pressable style={({ pressed }) => [e.botaoPrimario, pressed && e.pressionado]} onPress={proximo.acao}>
            <Text style={e.textoBotaoPrimario}>Ir para {proximo.rotulo.toLowerCase()}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={e.cardDestaque}>
        <Text style={e.rotuloEscuro}>Últimos 7 dias</Text>
        <Text style={e.numeroGrande}>{kmSemana.toFixed(1)} km</Text>
        <Text style={e.textoEscuro}>
          {qtdTreinos7} {qtdTreinos7 === 1 ? 'corrida' : 'corridas'} registradas
        </Text>
      </View>

      <View style={e.card}>
        <Text style={e.rotulo}>Próximo treino</Text>
        {proximaSessao ? (
          <>
            <Text style={e.tituloCard}>
              {formatarData(proximaSessao.data)} · {TIPOS[proximaSessao.tipo]?.nome}
            </Text>
            <Text style={e.textoSuave}>{proximaSessao.distancia_km} km</Text>
          </>
        ) : (
          <Text style={e.textoSuave}>Ainda não há treino planejado.</Text>
        )}

        <Pressable onPress={onAbrirAderencia} style={({ pressed }) => [styles.link, pressed && e.pressionado]}>
          <Text style={styles.linkTexto}>Ver aderência ao plano →</Text>
        </Pressable>
      </View>

      <View style={e.card}>
        <View style={styles.cabecalhoRotina}>
          <Text style={e.rotulo}>Sua rotina</Text>
          <Pressable onPress={onAbrirRotina} style={({ pressed }) => [styles.botaoEditar, pressed && e.pressionado]}>
            <Text style={styles.botaoEditarTexto}>Editar</Text>
          </Pressable>
        </View>
        <Text style={e.textoCorpo}>{resumoRotina}</Text>
      </View>

      <Pressable style={e.botaoSair} onPress={onSair}>
        <Text style={e.textoBotaoSair}>Sair da conta</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  linkTexto: { color: COR.amarelo, fontSize: 14, fontWeight: '700' },
  cabecalhoRotina: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botaoEditar: {
    borderWidth: 1,
    borderColor: COR.amarelo,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  botaoEditarTexto: { color: COR.amarelo, fontSize: 13, fontWeight: '700' },
});