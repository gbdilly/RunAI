// mobile/src/components/Chip.js
import { Pressable, StyleSheet, Text } from 'react-native';
import { COR } from '../constants/tema';

export default function Chip({ ativo, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: COR.borda,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COR.superficie2,
  },
  chipAtivo: { backgroundColor: COR.amarelo, borderColor: COR.amarelo },
  chipTexto: { color: COR.branco, fontSize: 14 },
  chipTextoAtivo: { color: COR.preto, fontWeight: '700' },
});