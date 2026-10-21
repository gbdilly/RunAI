import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

// ⚠️ Troque pelo IP do SEU computador (veja a explicação abaixo)
const API_URL = 'http://192.168.1.50:8000';

export default function App() {
  const [status, setStatus] = useState('Aguardando teste...');
  const [carregando, setCarregando] = useState(false);

  async function testarConexao() {
    setCarregando(true);
    setStatus('Conectando...');

    try {
      const resposta = await fetch(`${API_URL}/teste-banco`);
      const dados = await resposta.json();
      setStatus(`✅ Conectado!\n${JSON.stringify(dados)}`);
    } catch (erro) {
      setStatus(`❌ Falha na conexão:\n${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.titulo}>RunAI</Text>
      <Text style={styles.subtitulo}>Teste de conexão com o backend</Text>

      <Pressable
        style={({ pressed }) => [styles.botao, pressed && styles.botaoPressionado]}
        onPress={testarConexao}
        disabled={carregando}
      >
        {carregando ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text style={styles.textoBotao}>Testar conexão</Text>
        )}
      </Pressable>

      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const AMARELO = '#FFD700';
const PRETO = '#000000';
const BRANCO = '#FFFFFF';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRETO,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titulo: {
    fontSize: 44,
    fontWeight: 'bold',
    color: AMARELO,
  },
  subtitulo: {
    fontSize: 16,
    color: BRANCO,
    marginBottom: 40,
  },
  botao: {
    backgroundColor: AMARELO,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  botaoPressionado: {
    opacity: 0.8,
  },
  textoBotao: {
    color: PRETO,
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    color: BRANCO,
    marginTop: 28,
    textAlign: 'center',
    fontSize: 15,
  },
});