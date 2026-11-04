// mobile/src/telas/TelaClima.js
import { Pressable, Text, TextInput, View } from 'react-native';
import Metrica from '../components/Metrica';
import { COR, NOMES_DIAS } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { formatarData, iconeClima } from '../utils/datas';

export default function TelaClima({
  cidade,
  onCidade,
  cidadeSalva,
  previsao,
  onSalvarCidade,
  onBuscarClima,
}) {
  return (
    <>
      <Text style={e.secao}>Sua cidade</Text>
      <TextInput
        style={e.campo}
        placeholder="Ex.: Ivoti, RS"
        placeholderTextColor={COR.suave}
        value={cidade}
        onChangeText={onCidade}
        autoCorrect={false}
      />

      <Pressable style={({ pressed }) => [e.botaoPrimario, pressed && e.pressionado]} onPress={onSalvarCidade}>
        <Text style={e.textoBotaoPrimario}>Salvar cidade</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [e.botaoSecundario, pressed && e.pressionado]} onPress={onBuscarClima}>
        <Text style={e.textoBotaoSecundario}>Ver previsão</Text>
      </Pressable>

      {cidadeSalva ? <Text style={e.textoSuave}>Cidade atual: {cidadeSalva}</Text> : null}

      {previsao.map((dia) => (
        <View key={dia.data} style={e.card}>
          <View style={e.linhaTopo}>
            <Text style={e.tituloCard}>
              {NOMES_DIAS[dia.dia_semana]} · {formatarData(dia.data)}
            </Text>
            <Text style={e.iconeGrande}>
              {dia.status === 'previsto' ? iconeClima(dia.prob_chuva_pct) : '·'}
            </Text>
          </View>
          {dia.status === 'previsto' ? (
            <View style={e.metricas}>
              <Metrica rotulo="Chuva" valor={`${dia.prob_chuva_pct}%`} />
              <Metrica rotulo="Temp." valor={`${dia.temp_media_c} °C`} />
              <Metrica rotulo="Céu" valor={dia.descricao} />
            </View>
          ) : (
            <Text style={e.textoSuave}>Previsão ainda não disponível (a previsão cobre 5 dias).</Text>
          )}
        </View>
      ))}
    </>
  );
}