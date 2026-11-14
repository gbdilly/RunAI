// mobile/src/components/CartaoFeedback.js
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COR } from '../constants/tema';
import { chamarApi } from '../api/config';

const COR_LINK = '#7CFFB2';
const NOTAS = [1, 2, 3, 4, 5];

export default function CartaoFeedback({ token }) {
  const [carregando, setCarregando] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    verificar();
  }, []);

  async function verificar() {
    try {
      const { status, dados } = await chamarApi('/feedback-app/me', token);
      if (status === 200 && dados.enviado) setEnviado(true);
    } catch {
      // Se falhar, o link continua disponível
    } finally {
      setCarregando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setErro('');
  }

  async function enviar() {
    if (nota == null) return setErro('Escolha uma nota de 1 a 5.');
    setEnviando(true);
    setErro('');
    try {
      const { status, dados } = await chamarApi('/feedback-app', token, {
        method: 'POST',
        body: JSON.stringify({ nota, comentario: comentario.trim() || null }),
      });
      if (status === 201 || status === 409) {
        setEnviado(true);
        setTimeout(fechar, 1500);
      } else {
        setErro(dados.detail || 'Não foi possível enviar agora. Tente de novo.');
      }
    } catch {
      setErro('Verifique sua conexão e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return null;

  if (enviado) {
    return <Text style={styles.agradecimento}>Obrigado pela avaliação</Text>;
  }

  return (
    <View style={styles.area}>
      <Pressable onPress={() => setAberto(true)}>
        <Text style={styles.link}>Avaliação do aplicativo</Text>
      </Pressable>

      <Modal visible={aberto} transparent animationType="fade" onRequestClose={fechar}>
        <Pressable style={styles.fundo} onPress={fechar}>
          <Pressable style={styles.caixa} onPress={() => {}}>
            <Text style={styles.titulo}>Avalie o RunAI</Text>
            <Text style={styles.pergunta}>Como você avalia o aplicativo, de 1 a 5?</Text>

            <View style={styles.notas}>
              {NOTAS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setNota(n)}
                  style={[styles.nota, nota === n && styles.notaAtiva]}
                >
                  <Text style={[styles.notaTexto, nota === n && styles.notaTextoAtiva]}>{n}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.campo}
              placeholder="Opcional: o que achou ou o que pode melhorar"
              placeholderTextColor={COR.suave}
              value={comentario}
              onChangeText={setComentario}
              multiline
              maxLength={500}
            />

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}

            <Pressable
              onPress={enviar}
              disabled={enviando}
              style={({ pressed }) => [styles.enviar, (pressed || enviando) && styles.pressionado]}
            >
              {enviando ? (
                <ActivityIndicator color={COR.preto} />
              ) : (
                <Text style={styles.enviarTexto}>Enviar</Text>
              )}
            </Pressable>

            <Pressable onPress={fechar} style={styles.cancelar}>
              <Text style={styles.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  link: {
    color: COR_LINK,
    fontSize: 14,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  agradecimento: { color: COR.suave, fontSize: 13, marginTop: 16, textAlign: 'center' },

  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  caixa: {
    alignSelf: 'stretch',
    backgroundColor: COR.superficie,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: COR.borda,
  },
  titulo: { color: COR.branco, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  pergunta: { color: COR.suave, fontSize: 13, textAlign: 'center', marginTop: 6 },
  notas: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 16 },
  nota: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COR.borda,
    backgroundColor: COR.superficie2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notaAtiva: { backgroundColor: COR_LINK, borderColor: COR_LINK },
  notaTexto: { color: COR.branco, fontSize: 17, fontWeight: '700' },
  notaTextoAtiva: { color: COR.preto },
  campo: {
    marginTop: 16,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COR.borda,
    borderRadius: 12,
    padding: 12,
    color: COR.branco,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: COR.superficie2,
  },
  erro: { color: '#FF6B6B', fontSize: 13, marginTop: 8, textAlign: 'center' },
  enviar: {
    marginTop: 16,
    backgroundColor: COR_LINK,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  enviarTexto: { color: COR.preto, fontSize: 15, fontWeight: '800' },
  cancelar: { alignItems: 'center', paddingVertical: 12 },
  cancelarTexto: { color: COR.suave, fontSize: 14 },
  pressionado: { opacity: 0.75 },
});