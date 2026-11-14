// mobile/src/components/Trilha.js
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COR } from '../constants/tema';

// Bolinha, traço, bolinha... Cada passo pode ser tocado para ir até ele.
export default function Trilha({ passos }) {
  return (
    <View style={styles.linha}>
      {passos.map((p, i) => {
        const primeiro = i === 0;
        const ultimo = i === passos.length - 1;
        const anteriorFeito = !primeiro && passos[i - 1].feito;

        return (
          <Pressable key={p.rotulo} style={styles.item} onPress={p.acao} disabled={!p.acao}>
            <View style={styles.faixa}>
              <View style={[styles.traco, primeiro && styles.tracoOculto, anteriorFeito && styles.tracoAtivo]} />
              <View style={[styles.bolinha, p.feito && styles.bolinhaFeita]}>
                <Text style={[styles.bolinhaTexto, p.feito && styles.bolinhaTextoFeita]}>
                  {p.feito ? '✓' : String(i + 1)}
                </Text>
              </View>
              <View style={[styles.traco, ultimo && styles.tracoOculto, p.feito && styles.tracoAtivo]} />
            </View>
            <Text style={[styles.rotulo, p.feito && styles.rotuloFeito]}>{p.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignSelf: 'stretch', marginVertical: 8 },
  item: { flex: 1, alignItems: 'center' },
  faixa: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  traco: { flex: 1, height: 2, backgroundColor: COR.borda },
  tracoAtivo: { backgroundColor: COR.amarelo },
  tracoOculto: { backgroundColor: 'transparent' },
  bolinha: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COR.borda,
    backgroundColor: COR.superficie2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolinhaFeita: { backgroundColor: COR.amarelo, borderColor: COR.amarelo },
  bolinhaTexto: { color: COR.suave, fontSize: 12, fontWeight: '700' },
  bolinhaTextoFeita: { color: COR.preto },
  rotulo: { color: COR.suave, fontSize: 12, marginTop: 6, textAlign: 'center' },
  rotuloFeito: { color: COR.branco },
});