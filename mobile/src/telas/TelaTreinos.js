// mobile/src/telas/TelaTreinos.js
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Metrica from '../components/Metrica';
import { COR } from '../constants/tema';
import { estilos as e } from '../constants/estilos';
import { formatarData, formatarDuracao } from '../utils/datas';

export default function TelaTreinos({ treinos, sincronizando, onSincronizar }) {
  return (
    <>
      <View style={e.cardDestaque}>
        <Text style={e.rotuloEscuro}>Histórico do Strava</Text>
        <Text style={e.numeroGrande}>{treinos.length}</Text>
        <Text style={e.textoEscuro}>corridas importadas (últimos 90 dias)</Text>
      </View>

      <Pressable
        style={({ pressed }) => [e.botaoPrimario, (pressed || sincronizando) && e.pressionado]}
        onPress={onSincronizar}
        disabled={sincronizando}
      >
        {sincronizando ? (
          <ActivityIndicator color={COR.preto} />
        ) : (
          <Text style={e.textoBotaoPrimario}>Sincronizar agora</Text>
        )}
      </Pressable>

      {treinos.length === 0 ? (
        <Text style={e.textoSuave}>Nenhuma corrida ainda. Toque em sincronizar.</Text>
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