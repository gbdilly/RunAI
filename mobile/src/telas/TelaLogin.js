// mobile/src/telas/TelaLogin.js
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LogoImagem from '../../LogoImagem';
import Aviso from '../components/Aviso';
import { COR } from '../constants/tema';

export default function TelaLogin({ onEntrar, aviso, onFecharAviso }) {
  return (
    <View style={styles.centro}>
      <StatusBar style="light" />
      <LogoImagem largura={260} />

      <Text style={styles.frase}>Você corre. A gente planeja.</Text>
      <Text style={styles.subtitulo}>
        Seu histórico, a previsão e a sua rotina, transformados em treino.
      </Text>

      <Pressable style={({ pressed }) => [styles.botaoPrimario, pressed && styles.pressionado]} onPress={onEntrar}>
        <Text style={styles.textoBotaoPrimario}>Entrar com Strava</Text>
      </Pressable>

      {aviso ? (
        <View style={styles.avisoWrapper}>
          <Aviso
            key={aviso.id}
            tipo={aviso.tipo}
            titulo={aviso.titulo}
            texto={aviso.texto}
            onTentarNovamente={aviso.tentar}
            duracao={aviso.duracao}
            onFechar={onFecharAviso}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, backgroundColor: COR.fundo, alignItems: 'center', justifyContent: 'center', padding: 28 },
  frase: {
    color: COR.amarelo,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 24,
  },
  subtitulo: {
    color: COR.branco,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 36,
  },
  botaoPrimario: {
    backgroundColor: COR.amarelo,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  textoBotaoPrimario: { color: COR.preto, fontSize: 16, fontWeight: '800' },
  pressionado: { opacity: 0.75 },
  avisoWrapper: { alignSelf: 'stretch', marginTop: 20 },
});