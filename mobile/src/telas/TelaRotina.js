// mobile/src/telas/TelaRotina.js
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Aviso from '../components/Aviso';
import Chip from '../components/Chip';
import Stepper from '../components/Stepper';
import Trilha from '../components/Trilha';
import { DIAS, OBJETIVOS, COR } from '../constants/tema';
import { estilos as e } from '../constants/estilos';

export default function TelaRotina({
  objetivo,
  onObjetivo,
  diasSelecionados,
  onAlternarDia,
  diasPorSemana,
  onDiasPorSemana,
  onSalvar,
  aviso,
  onFecharAviso,
}) {
  const passos = [
    { rotulo: 'Objetivo', feito: !!objetivo },
    { rotulo: 'Dias', feito: diasSelecionados.length > 0 },
    { rotulo: 'Treinos', feito: diasPorSemana >= 1 && diasPorSemana <= diasSelecionados.length },
  ];

  return (
    <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Monte sua rotina</Text>
      <Text style={e.textoSuave}>Preencha as três etapas e depois toque em Salvar.</Text>

      <Trilha passos={passos} />

      {aviso ? (
        <Aviso
          key={aviso.id}
          tipo={aviso.tipo}
          titulo={aviso.titulo}
          texto={aviso.texto}
          onTentarNovamente={aviso.tentar}
          duracao={aviso.duracao}
          onFechar={onFecharAviso}
        />
      ) : null}

      <Text style={e.rotuloPequeno}>1. Qual é o seu objetivo?</Text>
      <View style={e.linha}>
        {OBJETIVOS.map((item) => (
          <Chip key={item.codigo} ativo={objetivo === item.codigo} onPress={() => onObjetivo(item.codigo)}>
            {item.nome}
          </Chip>
        ))}
      </View>

      <Text style={e.rotuloPequeno}>2. Em quais dias você pode treinar?</Text>
      <View style={e.linha}>
        {DIAS.map((dia) => (
          <Chip key={dia.codigo} ativo={diasSelecionados.includes(dia.codigo)} onPress={() => onAlternarDia(dia.codigo)}>
            {dia.nome}
          </Chip>
        ))}
      </View>

      <Text style={e.rotuloPequeno}>3. Quantos treinos na semana?</Text>
      <Stepper valor={diasPorSemana} maximo={diasSelecionados.length} onChange={onDiasPorSemana} />

      <Pressable style={({ pressed }) => [e.botaoPrimario, pressed && e.pressionado]} onPress={onSalvar}>
        <Text style={e.textoBotaoPrimario}>Salvar rotina</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  titulo: { color: COR.branco, fontSize: 22, fontWeight: '800', marginTop: 8 },
});