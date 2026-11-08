// mobile/src/components/TextoGlossario.js
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GLOSSARIO } from '../constants/glossario';
import { COR } from '../constants/tema';

// Remove pontuação e deixa minúsculo para comparar com o glossário
const normalizar = (palavra) => palavra.toLowerCase().replace(/[.,;:()!?"']/g, '');

export default function TextoGlossario({ texto, estilo }) {
  const [termoAberto, setTermoAberto] = useState(null);

  // Mantém os espaços no split para o texto não perder a formatação
  const partes = String(texto ?? '').split(/(\s+)/);

  return (
    <View>
      <Text style={estilo}>
        {partes.map((parte, i) => {
          const chave = normalizar(parte);
          if (chave && GLOSSARIO[chave]) {
            return (
              <Text
                key={i}
                style={styles.termo}
                onPress={() => setTermoAberto(termoAberto === chave ? null : chave)}
              >
                {parte}
              </Text>
            );
          }
          return <Text key={i}>{parte}</Text>;
        })}
      </Text>

      {termoAberto ? (
        <Pressable onPress={() => setTermoAberto(null)} style={styles.caixa}>
          <Text style={styles.caixaTitulo}>{termoAberto}</Text>
          <Text style={styles.caixaTexto}>{GLOSSARIO[termoAberto]}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  termo: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: COR.amarelo,
    color: COR.amarelo,
  },
  caixa: {
    marginTop: 8,
    backgroundColor: COR.superficie2,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COR.amarelo,
    padding: 10,
  },
  caixaTitulo: { color: COR.amarelo, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  caixaTexto: { color: COR.branco, fontSize: 13, lineHeight: 18 },
});