// mobile/src/components/Aviso.js
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { COR } from '../constants/tema';

const VISUAL = {
  carregando: { cor: COR.amarelo, icone: '' },
  sucesso: { cor: '#7CFFB2', icone: '✓' },
  aviso: { cor: COR.amarelo, icone: '!' },
  erro: { cor: '#FF6B6B', icone: '✕' },
};

// duracao (ms): se informada, a barra encolhe e o aviso chama onFechar ao terminar
export default function Aviso({ tipo = 'aviso', titulo, texto, onTentarNovamente, duracao, onFechar }) {
  const visual = VISUAL[tipo] ?? VISUAL.aviso;
  const progresso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!duracao) return undefined;
    progresso.setValue(1);
    const animacao = Animated.timing(progresso, {
      toValue: 0,
      duration: duracao,
      useNativeDriver: false,
    });
    animacao.start(({ finished }) => {
      if (finished && onFechar) onFechar();
    });
    return () => animacao.stop();
  }, [duracao]);

  const podeFechar = !!onFechar && tipo !== 'carregando';

  return (
    <Pressable
      onPress={podeFechar ? onFechar : undefined}
      disabled={!podeFechar}
      style={[styles.cartao, { borderLeftColor: visual.cor }]}
    >
      <View style={[styles.icone, { borderColor: visual.cor }]}>
        {tipo === 'carregando' ? (
          <ActivityIndicator size="small" color={visual.cor} />
        ) : (
          <Text style={[styles.iconeTexto, { color: visual.cor }]}>{visual.icone}</Text>
        )}
      </View>

      <View style={styles.corpo}>
        {titulo ? <Text style={[styles.titulo, { color: visual.cor }]}>{titulo}</Text> : null}
        {texto ? <Text style={styles.texto}>{texto}</Text> : null}

        {onTentarNovamente ? (
          <Pressable
            onPress={onTentarNovamente}
            style={({ pressed }) => [styles.botao, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.botaoTexto}>Tentar de novo</Text>
          </Pressable>
        ) : null}

        {duracao ? (
          <View style={styles.trilho}>
            <Animated.View
              style={[
                styles.barra,
                {
                  backgroundColor: visual.cor,
                  width: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COR.superficie,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeTexto: { fontSize: 15, fontWeight: '800' },
  corpo: { flex: 1 },
  titulo: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  texto: { color: COR.branco, fontSize: 14, lineHeight: 20 },
  botao: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COR.amarelo,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  botaoTexto: { color: COR.amarelo, fontSize: 13, fontWeight: '700' },
  trilho: {
    marginTop: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: COR.borda,
    overflow: 'hidden',
  },
  barra: { height: 3 },
});