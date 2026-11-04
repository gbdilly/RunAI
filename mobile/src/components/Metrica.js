// mobile/src/components/Metrica.js
import { StyleSheet, Text, View } from 'react-native';
import { COR } from '../constants/tema';

export default function Metrica({ rotulo, valor }) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaValor}>{valor}</Text>
      <Text style={styles.metricaRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metrica: { flex: 1, alignItems: 'flex-start' },
  metricaValor: { color: COR.branco, fontSize: 15, fontWeight: '700' },
  metricaRotulo: { color: COR.suave, fontSize: 12, marginTop: 2 },
});