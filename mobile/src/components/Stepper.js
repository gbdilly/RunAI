// mobile/src/components/Stepper.js
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COR } from '../constants/tema';

// Quadrado com número e setinha. Só permite valores de 1 até 'maximo'.
export default function Stepper({ valor, maximo, onChange }) {
  const [aberto, setAberto] = useState(false);
  const semDias = maximo < 1;
  const valorExibido = semDias ? 0 : Math.min(valor, maximo);
  const opcoes = Array.from({ length: maximo }, (_, i) => i + 1);

  return (
    <View>
      <Pressable
        disabled={semDias}
        onPress={() => setAberto(!aberto)}
        style={[styles.caixa, semDias && styles.caixaDesabilitada]}
      >
        <Text style={styles.numero}>{semDias ? '—' : valorExibido}</Text>
        <Text style={styles.seta}>{aberto ? '▲' : '▼'}</Text>
      </Pressable>

      {aberto ? (
        <View style={styles.opcoes}>
          {opcoes.map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                onChange(n);
                setAberto(false);
              }}
              style={[styles.opcao, n === valorExibido && styles.opcaoAtiva]}
            >
              <Text style={[styles.opcaoTexto, n === valorExibido && styles.opcaoTextoAtiva]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.ajuda}>
        {semDias
          ? 'Escolha os dias disponíveis primeiro.'
          : `Você marcou ${maximo} ${maximo === 1 ? 'dia' : 'dias'}. Pode reduzir o número de treinos.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    width: 84,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COR.amarelo,
    backgroundColor: COR.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaDesabilitada: { borderColor: COR.borda, opacity: 0.5 },
  numero: { color: COR.amarelo, fontSize: 24, fontWeight: '800' },
  seta: { color: COR.amarelo, fontSize: 12, marginTop: -2 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  opcao: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COR.borda,
    backgroundColor: COR.superficie2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcaoAtiva: { backgroundColor: COR.amarelo, borderColor: COR.amarelo },
  opcaoTexto: { color: COR.branco, fontSize: 16, fontWeight: '700' },
  opcaoTextoAtiva: { color: COR.preto },
  ajuda: { color: COR.suave, fontSize: 13, marginTop: 8, lineHeight: 18 },
});