import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// Endereço do ngrok: o celular não enxerga o localhost do computador
const API_URL = 'https://slab-spied-handsfree.ngrok-free.dev';
const CABECALHOS = { 'ngrok-skip-browser-warning': 'true' };

const INTERVALO_CONSULTA_MS = 5000;
const MAXIMO_CONSULTAS = 120; // 120 x 5 s = 10 minutos

const OBJETIVOS = [
  { codigo: '5km', nome: '5 km' },
  { codigo: '10km', nome: '10 km' },
  { codigo: 'meia', nome: 'Meia maratona' },
  { codigo: 'maratona', nome: 'Maratona' },
  { codigo: 'melhorar_tempo', nome: 'Melhorar tempo' },
];

const DIAS = [
  { codigo: 'seg', nome: 'Seg' },
  { codigo: 'ter', nome: 'Ter' },
  { codigo: 'qua', nome: 'Qua' },
  { codigo: 'qui', nome: 'Qui' },
  { codigo: 'sex', nome: 'Sex' },
  { codigo: 'sab', nome: 'Sáb' },
  { codigo: 'dom', nome: 'Dom' },
];

const NOMES_DIAS = Object.fromEntries(DIAS.map((d) => [d.codigo, d.nome]));

// Converte 2026-10-23 em 23/10/2026 (formato brasileiro)
function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Lê a resposta como texto e tenta converter para JSON
async function lerResposta(resposta) {
  const texto = await resposta.text();
  try {
    return { status: resposta.status, dados: JSON.parse(texto) };
  } catch {
    return { status: resposta.status, dados: { detail: `Resposta inesperada (${resposta.status}): ${texto.slice(0, 120)}` } };
  }
}

export default function App() {
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  // Preferências
  const [objetivo, setObjetivo] = useState(null);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [diasPorSemana, setDiasPorSemana] = useState(3);

  // Cidade e clima
  const [cidade, setCidade] = useState('');
  const [previsao, setPrevisao] = useState([]);

  // Plano
  const [plano, setPlano] = useState(null);
  const [gerandoPlano, setGerandoPlano] = useState(false);

  // Faz a consulta de plano parar quando o corredor sai do app
  const ativoRef = useRef(true);

  useEffect(() => {
    SecureStore.getItemAsync('token')
      .then(setToken)
      .finally(() => setCarregando(false));
    return () => {
      ativoRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (token) {
      carregarPreferencias();
      carregarPlanoAtual();
    }
  }, [token]);

  async function entrarComStrava() {
    setMensagem('');
    const destino = Linking.createURL('autenticado');
    const url = `${API_URL}/auth/strava/login?destino=${encodeURIComponent(destino)}`;

    const resultado = await WebBrowser.openAuthSessionAsync(url, destino);

    if (resultado.type !== 'success') {
      setMensagem('Login cancelado.');
      return;
    }

    const { queryParams } = Linking.parse(resultado.url);
    if (queryParams.erro) {
      setMensagem('Você não autorizou o RunAI no Strava.');
      return;
    }

    await SecureStore.setItemAsync('token', queryParams.token);
    setToken(queryParams.token);
  }

  async function sair() {
    ativoRef.current = false;
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    setObjetivo(null);
    setDiasSelecionados([]);
    setCidade('');
    setPrevisao([]);
    setPlano(null);
    setGerandoPlano(false);
    setMensagem('');
  }

  async function carregarPreferencias() {
    try {
      const resposta = await fetch(`${API_URL}/preferencias/me`, {
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}` },
      });
      const { status, dados } = await lerResposta(resposta);
      if (status === 200) {
        setObjetivo(dados.objetivo);
        setDiasSelecionados(dados.dias_disponiveis);
        setDiasPorSemana(dados.dias_por_semana);
      } else if (status === 401) {
        setMensagem('Sessão expirada. Entre de novo.');
      }
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    }
  }

  // Mostra o último plano pronto ao abrir o app, sem gerar de novo
  async function carregarPlanoAtual() {
    try {
      const resposta = await fetch(`${API_URL}/planos/me`, {
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}` },
      });
      const { status, dados } = await lerResposta(resposta);
      if (status === 200 && dados.estado === 'pronto') {
        setPlano(dados.resultado);
      }
    } catch {
      // Sem plano salvo na memória do servidor: a tela fica sem plano
    }
  }

  function alternarDia(codigo) {
    setDiasSelecionados((atual) =>
      atual.includes(codigo) ? atual.filter((d) => d !== codigo) : [...atual, codigo]
    );
  }

  async function salvarPreferencias() {
    if (!objetivo) {
      setMensagem('Escolha um objetivo.');
      return;
    }
    if (diasSelecionados.length === 0) {
      setMensagem('Escolha pelo menos um dia disponível.');
      return;
    }
    if (diasPorSemana > diasSelecionados.length) {
      setMensagem('Dias por semana não pode ser maior que os dias disponíveis.');
      return;
    }

    setMensagem('Salvando...');
    try {
      const resposta = await fetch(`${API_URL}/preferencias/me`, {
        method: 'PUT',
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objetivo,
          dias_por_semana: diasPorSemana,
          dias_disponiveis: diasSelecionados,
        }),
      });
      const { status, dados } = await lerResposta(resposta);
      if (status === 200) {
        setMensagem('Preferências salvas.');
      } else if (status === 401) {
        setMensagem('Sessão expirada. Entre de novo.');
      } else {
        setMensagem(`Erro ${status}: ${JSON.stringify(dados.detail ?? dados)}`);
      }
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    }
  }

  async function salvarCidade() {
    const alvo = cidade.trim();
    if (alvo.length < 3) {
      setMensagem('Digite a cidade com o estado, por exemplo: Ivoti, RS.');
      return;
    }

    setMensagem('Salvando cidade...');
    try {
      const resposta = await fetch(`${API_URL}/clima/cidade`, {
        method: 'PUT',
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cidade: alvo }),
      });
      const { status, dados } = await lerResposta(resposta);
      if (status === 200) {
        setCidade(dados.cidade);
        setMensagem(`Cidade salva: ${dados.cidade}`);
      } else {
        setMensagem(`Erro ${status}: ${dados.detail || ''}`);
      }
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    }
  }

  async function buscarClima() {
    setMensagem('Buscando previsão...');
    try {
      const resposta = await fetch(`${API_URL}/clima/me`, {
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}` },
      });
      const { status, dados } = await lerResposta(resposta);
      if (status === 200) {
        setPrevisao(dados.dias);
        setMensagem('');
      } else {
        setPrevisao([]);
        setMensagem(`Erro ${status}: ${dados.detail || ''}`);
      }
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    }
  }

  // Inicia a geração e acompanha até ficar pronta, com erro ou tempo esgotado
  async function gerarPlano() {
    ativoRef.current = true;
    setGerandoPlano(true);
    setPlano(null);
    setMensagem('Gerando plano com a IA. Pode levar alguns minutos...');

    try {
      const inicio = await fetch(`${API_URL}/planos/gerar`, {
        method: 'POST',
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}` },
      });
      const { status, dados } = await lerResposta(inicio);
      if (status !== 202) {
        setMensagem(`Erro ${status}: ${dados.detail || ''}`);
        return;
      }

      for (let i = 0; i < MAXIMO_CONSULTAS; i++) {
        await esperar(INTERVALO_CONSULTA_MS);
        if (!ativoRef.current) return;

        const consulta = await fetch(`${API_URL}/planos/me`, {
          headers: { ...CABECALHOS, Authorization: `Bearer ${token}` },
        });
        const { status: st, dados: d } = await lerResposta(consulta);

        if (st === 401) {
          setMensagem('Sessão expirada. Entre de novo.');
          return;
        }
        if (d.estado === 'pronto') {
          setPlano(d.resultado);
          setMensagem('');
          return;
        }
        if (d.estado === 'erro') {
          setMensagem(`Erro ao gerar o plano: ${d.mensagem}`);
          return;
        }
      }

      setMensagem('O plano demorou demais. Toque em Gerar plano de novo para tentar.');
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    } finally {
      setGerandoPlano(false);
    }
  }

  async function sincronizarTreinos() {
    setMensagem('Sincronizando treinos...');
    try {
      const resposta = await fetch(`${API_URL}/treinos/sincronizar`, {
        method: 'POST',
        headers: { ...CABECALHOS, Authorization: `Bearer ${token}` },
      });
      const { status, dados } = await lerResposta(resposta);
      if (status === 401) {
        setMensagem('Sessão expirada. Entre de novo.');
        return;
      }
      setMensagem(
        status === 200
          ? `Corridas: ${dados.encontradas} encontradas, ${dados.novas} novas`
          : `Erro ${status}: ${dados.detail || ''}`
      );
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    }
  }

  if (carregando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFD700" />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.titulo}>RunAI</Text>
        <Text style={styles.subtitulo}>Entre com a sua conta do Strava</Text>
        <Pressable style={styles.botao} onPress={entrarComStrava}>
          <Text style={styles.textoBotao}>Entrar com Strava</Text>
        </Pressable>
        {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.containerLogado} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <Text style={styles.titulo}>RunAI</Text>

      <Text style={styles.secao}>Objetivo</Text>
      <View style={styles.linha}>
        {OBJETIVOS.map((item) => (
          <Pressable
            key={item.codigo}
            style={[styles.chip, objetivo === item.codigo && styles.chipAtivo]}
            onPress={() => setObjetivo(item.codigo)}
          >
            <Text style={[styles.chipTexto, objetivo === item.codigo && styles.chipTextoAtivo]}>
              {item.nome}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.secao}>Dias disponíveis</Text>
      <View style={styles.linha}>
        {DIAS.map((dia) => (
          <Pressable
            key={dia.codigo}
            style={[styles.chip, diasSelecionados.includes(dia.codigo) && styles.chipAtivo]}
            onPress={() => alternarDia(dia.codigo)}
          >
            <Text style={[styles.chipTexto, diasSelecionados.includes(dia.codigo) && styles.chipTextoAtivo]}>
              {dia.nome}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.secao}>Dias de treino por semana: {diasPorSemana}</Text>
      <View style={styles.linha}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Pressable
            key={n}
            style={[styles.chip, diasPorSemana === n && styles.chipAtivo]}
            onPress={() => setDiasPorSemana(n)}
          >
            <Text style={[styles.chipTexto, diasPorSemana === n && styles.chipTextoAtivo]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.botao} onPress={salvarPreferencias}>
        <Text style={styles.textoBotao}>Salvar preferências</Text>
      </Pressable>

      <Text style={styles.secao}>Cidade</Text>
      <TextInput
        style={styles.campo}
        placeholder="Ex.: Ivoti, RS"
        placeholderTextColor="#777"
        value={cidade}
        onChangeText={setCidade}
        autoCorrect={false}
      />

      <Pressable style={styles.botao} onPress={salvarCidade}>
        <Text style={styles.textoBotao}>Salvar cidade</Text>
      </Pressable>
      <Pressable style={styles.botaoSecundario} onPress={buscarClima}>
        <Text style={styles.textoBotaoSecundario}>Ver previsão</Text>
      </Pressable>

      {previsao.map((dia) => (
        <View key={dia.data} style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>
            {NOMES_DIAS[dia.dia_semana]} {formatarData(dia.data)}
          </Text>
          <Text style={styles.cartaoTexto}>
            {dia.status === 'previsto'
              ? `Chuva ${dia.prob_chuva_pct}% · ${dia.temp_media_c} °C · ${dia.descricao}`
              : 'Previsão ainda não disponível para este dia (a previsão cobre 5 dias).'}
          </Text>
        </View>
      ))}

      <Text style={styles.secao}>Plano da semana</Text>
      <Pressable style={styles.botao} onPress={gerarPlano} disabled={gerandoPlano}>
        {gerandoPlano ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text style={styles.textoBotao}>Gerar plano</Text>
        )}
      </Pressable>

      {plano ? (
        <View style={styles.cartaoPlano}>
          <Text style={styles.cartaoTitulo}>Risco: {plano.nivel_risco}</Text>
          <Text style={styles.cartaoTexto}>{plano.resumo}</Text>
          {plano.alertas.map((alerta, i) => (
            <Text key={i} style={styles.alerta}>⚠ {alerta}</Text>
          ))}
          {plano.sessoes.map((s) => (
            <View key={s.data} style={styles.cartao}>
              <Text style={styles.cartaoTitulo}>
                {formatarData(s.data)} · {s.tipo} · {s.distancia_km} km
              </Text>
              <Text style={styles.cartaoTexto}>{s.descricao}</Text>
              <Text style={styles.cartaoTextoSuave}>{s.clima}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.botao} onPress={sincronizarTreinos}>
        <Text style={styles.textoBotao}>Sincronizar treinos</Text>
      </Pressable>

      <Pressable style={styles.botaoSecundario} onPress={sair}>
        <Text style={styles.textoBotaoSecundario}>Sair</Text>
      </Pressable>

      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}
    </ScrollView>
  );
}

const AMARELO = '#FFD700';
const PRETO = '#000000';
const BRANCO = '#FFFFFF';
const CINZA = '#1A1A1A';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRETO,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  containerLogado: {
    backgroundColor: PRETO,
    alignItems: 'center',
    padding: 24,
    paddingTop: 64,
  },
  titulo: { fontSize: 44, fontWeight: 'bold', color: AMARELO, marginBottom: 12 },
  subtitulo: { fontSize: 16, color: BRANCO, marginBottom: 32, textAlign: 'center' },
  secao: { color: AMARELO, fontSize: 16, fontWeight: 'bold', marginTop: 24, marginBottom: 8, alignSelf: 'flex-start' },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  chip: {
    borderColor: AMARELO,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: CINZA,
  },
  chipAtivo: { backgroundColor: AMARELO },
  chipTexto: { color: AMARELO, fontSize: 14 },
  chipTextoAtivo: { color: PRETO, fontWeight: 'bold' },
  campo: {
    alignSelf: 'stretch',
    borderColor: AMARELO,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: BRANCO,
    backgroundColor: CINZA,
    fontSize: 16,
  },
  botao: {
    backgroundColor: AMARELO,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 240,
    alignItems: 'center',
    marginTop: 20,
  },
  textoBotao: { color: PRETO, fontSize: 18, fontWeight: 'bold' },
  botaoSecundario: {
    borderColor: AMARELO,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 240,
    alignItems: 'center',
    marginTop: 12,
  },
  textoBotaoSecundario: { color: AMARELO, fontSize: 16, fontWeight: 'bold' },
  cartao: {
    alignSelf: 'stretch',
    backgroundColor: CINZA,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  cartaoPlano: { alignSelf: 'stretch', marginTop: 16 },
  cartaoTitulo: { color: AMARELO, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  cartaoTexto: { color: BRANCO, fontSize: 14 },
  cartaoTextoSuave: { color: '#AAAAAA', fontSize: 13, marginTop: 4 },
  alerta: { color: AMARELO, marginTop: 8, fontSize: 14 },
  mensagem: { color: BRANCO, marginTop: 24, textAlign: 'center' },
});