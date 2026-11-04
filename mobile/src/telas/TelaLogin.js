// mobile/src/telas/TelaLogin.js
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LogoImagem from '../../LogoImagem';
import { COR } from '../constants/tema';

export default function TelaLogin({ onEntrar, mensagem }) {
  return (
    <View style={styles.centro}>
      <StatusBar style="light" />
      <LogoImagem largura={260} />
      <Text style={styles.subtitulo}>
        Treinos personalizados com base no seu histórico do Strava, na previsão do tempo e na sua rotina.
      </Text>
      <Pressable style={({ pressed }) => [styles.botaoPrimario, pressed && styles.pressionado]} onPress={onEntrar}>
        <Text style={styles.textoBotaoPrimario}>Entrar com Strava</Text>
      </Pressable>
      {mensagem ? <Text style={styles.aviso}>{mensagem}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, backgroundColor: COR.fundo, alignItems: 'center', justifyContent: 'center', padding: 28 },
  subtitulo: { color: COR.branco, fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 24, marginBottom: 36 },
  botaoPrimario: { backgroundColor: COR.amarelo, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, alignSelf: 'stretch' },
  textoBotaoPrimario: { color: COR.preto, fontSize: 16, fontWeight: '800' },
  pressionado: { opacity: 0.75 },
  aviso: { color: COR.suave, marginTop: 20, textAlign: 'center' },
});