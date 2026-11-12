// mobile/src/telas/TelaInicio.js
import { Pressable, Text, View } from 'react-native';
import { TIPOS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { formatarData } from '../utils/datas';

export default function TelaInicio({
  kmSemana,
  qtdTreinos7,
  proximaSessao,
  resumoRotina,
  onAbrirRotina,
  onAbrirAderencia,
  onSair,
}) {
  return (
    <>
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
          <Text style={e.textoSuave}>Nenhum plano ativo. Gere um na aba Plano.</Text>
        )}
      </View>

      <View style={e.card}>
        <Text style={e.rotulo}>Sua rotina</Text>
        <Text style={e.textoCorpo}>{resumoRotina}</Text>
      </View>

      <Pressable style={({ pressed }) => [e.botaoPrimario, pressed && e.pressionado]} onPress={onAbrirAderencia}>
        <Text style={e.textoBotaoPrimario}>Ver aderência aos planos</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [e.botaoSecundario, pressed && e.pressionado]} onPress={onAbrirRotina}>
        <Text style={e.textoBotaoSecundario}>Editar rotina</Text>
      </Pressable>

      <Pressable style={e.botaoSair} onPress={onSair}>
        <Text style={e.textoBotaoSair}>Sair da conta</Text>
      </Pressable>
    </>
  );
}