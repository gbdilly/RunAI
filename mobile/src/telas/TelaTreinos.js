// mobile/src/telas/TelaTreinos.js
import { Text, View } from 'react-native';
import Metrica from '../components/Metrica';
import { estilos as e } from '../constants/estilos';
import { formatarData, formatarDuracao } from '../utils/datas';

export default function TelaTreinos({ treinos }) {
  return (
    <>
      <View style={e.cardDestaque}>
        <Text style={e.rotuloEscuro}>Histórico do Strava</Text>
        <Text style={e.numeroGrande}>{treinos.length}</Text>
        <Text style={e.textoEscuro}>corridas importadas (últimos 90 dias)</Text>
      </View>

      {treinos.length === 0 ? (
        <Text style={e.textoSuave}>
          Nenhuma corrida ainda. Ao abrir o app, suas corridas do Strava são importadas automaticamente.
        </Text>
      ) : null}

      {treinos.map((t) => (
        <View key={t.id} style={e.card}>
          <View style={e.linhaTopo}>
            <Text style={e.tituloCard}>{formatarData(t.data)}</Text>
            <Text style={e.destaqueKm}>{t.distancia_km.toFixed(2)} km</Text>
          </View>
          <View style={e.metricas}>
            <Metrica rotulo="Tempo" valor={formatarDuracao(t.duracao_min)} />
            <Metrica rotulo="Elevação" valor={t.elevacao_m != null ? `${Math.round(t.elevacao_m)} m` : '—'} />
            <Metrica rotulo="FC média" valor={t.fc_media != null ? `${t.fc_media} bpm` : '—'} />
          </View>
        </View>
      ))}
    </>
  );
}