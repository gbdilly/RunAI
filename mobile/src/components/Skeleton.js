// mobile/src/components/Skeleton.js
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { COR } from '../constants/tema';

// Bloco cinza que pulsa, usado enquanto o conteúdo carrega
export function Skeleton({ largura = '100%', altura = 16, raio = 8, style }) {
  const opacidade = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacidade, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animacao.start();
    return () => animacao.stop();
  }, [opacidade]);

  return (
    <Animated.View
      style={[
        {
          width: largura,
          height: altura,
          borderRadius: raio,
          backgroundColor: COR.superficie2,
          opacity: opacidade,
        },
        style,
      ]}
    />
  );
}

// Formato de um cartão de treino ou dia, em cinza
export function SkeletonCartao({ linhas = 2 }) {
  return (
    <View style={styles.cartao}>
      <View style={styles.topo}>
        <Skeleton largura={140} altura={16} />
        <Skeleton largura={64} altura={20} raio={999} />
      </View>
      <View style={styles.espaco} />
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton
          key={i}
          largura={i === linhas - 1 ? '70%' : '100%'}
          altura={12}
          style={styles.linha}
        />
      ))}
    </View>
  );
}

// Lista de cartões em cinza
export function SkeletonLista({ quantidade = 3, linhas = 2 }) {
  return (
    <View style={styles.lista}>
      {Array.from({ length: quantidade }, (_, i) => (
        <SkeletonCartao key={i} linhas={linhas} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { alignSelf: 'stretch', gap: 12 },
  cartao: {
    alignSelf: 'stretch',
    backgroundColor: COR.superficie,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COR.borda,
  },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  espaco: { height: 12 },
  linha: { marginTop: 8 },
});