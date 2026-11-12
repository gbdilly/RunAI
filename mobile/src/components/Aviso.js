// mobile/src/components/Aviso.js
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COR } from '../constants/tema';

// Cor e ícone de cada tipo de aviso
const VISUAL = {
  carregando: { cor: COR.amarelo, icone: '' },
  sucesso: { cor: '#7CFFB2', icone: '✓' },
  aviso: { cor: COR.amarelo, icone: '!' },
  erro: { cor: '#FF6B6B', icone: '✕' },
};

export default function Aviso({ tipo = 'aviso', titulo, texto, onTentarNovamente }) {
  const visual = VISUAL[tipo] ?? VISUAL.aviso;

  return (
    <View style={[styles.cartao, { borderLeftColor: visual.cor }]}>
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
      </View>
    </View>
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
});