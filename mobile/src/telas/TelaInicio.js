// mobile/src/telas/TelaInicio.js
import { Pressable, Text, View } from 'react-native';
import Chip from '../components/Chip';
import { DIAS, OBJETIVOS, TIPOS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { formatarData } from '../utils/datas';

export default function TelaInicio({
  kmSemana,
  qtdTreinos7,
  proximaSessao,
  objetivo,
  onObjetivo,
  diasSelecionados,
  onAlternarDia,
  diasPorSemana,
  onDiasPorSemana,
  onSalvarRotina,
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
            <Text style={e.textoSuave}>
              {proximaSessao.distancia_km} km · {proximaSessao.descricao}
            </Text>
          </>
        ) : (
          <Text style={e.textoSuave}>Nenhum plano ativo. Gere um na aba Plano.</Text>
        )}
      </View>

      <Text style={e.secao}>Minha rotina</Text>

      <Text style={e.rotuloPequeno}>Objetivo</Text>
      <View style={e.linha}>
        {OBJETIVOS.map((item) => (
          <Chip key={item.codigo} ativo={objetivo === item.codigo} onPress={() => onObjetivo(item.codigo)}>
            {item.nome}
          </Chip>
        ))}
      </View>

      <Text style={e.rotuloPequeno}>Dias disponíveis</Text>
      <View style={e.linha}>
        {DIAS.map((dia) => (
          <Chip key={dia.codigo} ativo={diasSelecionados.includes(dia.codigo)} onPress={() => onAlternarDia(dia.codigo)}>
            {dia.nome}
          </Chip>
        ))}
      </View>

      <Text style={e.rotuloPequeno}>Treinos por semana</Text>
      <View style={e.linha}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Chip key={n} ativo={diasPorSemana === n} onPress={() => onDiasPorSemana(n)}>
            {String(n)}
          </Chip>
        ))}
      </View>

      <Pressable style={({ pressed }) => [e.botaoPrimario, pressed && e.pressionado]} onPress={onSalvarRotina}>
        <Text style={e.textoBotaoPrimario}>Salvar rotina</Text>
      </Pressable>

      <Pressable style={e.botaoSair} onPress={onSair}>
        <Text style={e.textoBotaoSair}>Sair da conta</Text>
      </Pressable>
    </>
  );
}