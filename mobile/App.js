import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStoreNativo from 'expo-secure-store';
import LogoImagem from './LogoImagem';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://slab-spied-handsfree.ngrok-free.dev';
const CABECALHOS = { 'ngrok-skip-browser-warning': 'true' };

const INTERVALO_CONSULTA_MS = 5000;
const MAXIMO_CONSULTAS = 120;
const INTERVALO_SINCRONIZACAO_MS = 10 * 60 * 1000;

const COR = {
  amarelo: '#FFD700',
  fundo: '#0A0A0A',
  superficie: '#161616',
  superficie2: '#202020',
  borda: '#2A2A2A',
  branco: '#FFFFFF',
  suave: '#9A9A9A',
  preto: '#000000',
};

const TIPOS = {
  rodagem: { nome: 'Rodagem', cor: '#FFD700' },
  intervalado: { nome: 'Intervalado', cor: '#FF8A3D' },
  longao: { nome: 'Longão', cor: '#7CFFB2' },
  descanso: { nome: 'Descanso', cor: '#5C5C5C' },
};

const OBJETIVOS = [
  { codigo: '5km', nome: '5 km' },
  { codigo: '10km', nome: '10 km' },
  { codigo: 'meia', nome: 'Meia' },
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
const CODIGO_POR_INDICE = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const ABAS = [
  { codigo: 'inicio', nome: 'Início', icone: '⌂' },
  { codigo: 'treinos', nome: 'Treinos', icone: '↗' },
  { codigo: 'clima', nome: 'Clima', icone: '☁' },
  { codigo: 'plano', nome: 'Plano', icone: '✦' },
];

// Armazenamento: SecureStore no celular, localStorage no navegador
const armazenamento = {
  async get(chave) {
    if (Platform.OS === 'web') return window.localStorage.getItem(chave);
    return SecureStoreNativo.getItemAsync(chave);
  },
  async set(chave, valor) {
    if (Platform.OS === 'web') return window.localStorage.setItem(chave, valor);
    return SecureStoreNativo.setItemAsync(chave, valor);
  },
  async remove(chave) {
    if (Platform.OS === 'web') return window.localStorage.removeItem(chave);
    return SecureStoreNativo.deleteItemAsync(chave);
  },
};

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isoLocal(d = new Date()) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function diaDaSemana(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const indice = new Date(ano, mes - 1, dia, 12).getDay();
  return NOMES_DIAS[CODIGO_POR_INDICE[indice]];
}

function formatarDuracao(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

function iconeClima(prob) {
  if (prob == null) return '·';
  if (prob >= 60) return '🌧';
  if (prob >= 30) return '⛅';
  return '☀';
}

async function lerResposta(resposta) {
  const texto = await resposta.text();
  try {
    return { status: resposta.status, dados: JSON.parse(texto) };
  } catch {
    return { status: resposta.status, dados: { detail: `Resposta inesperada (${resposta.status}): ${texto.slice(0, 120)}` } };
  }
}

async function chamarApi(caminho, token, opcoes = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: {
      ...CABECALHOS,
      Authorization: `Bearer ${token}`,
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return lerResposta(resposta);
}

export default function App() {
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('inicio');

  const [objetivo, setObjetivo] = useState(null);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [diasPorSemana, setDiasPorSemana] = useState(3);

  const [cidade, setCidade] = useState('');
  const [cidadeSalva, setCidadeSalva] = useState('');
  const [previsao, setPrevisao] = useState([]);

  const [treinos, setTreinos] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);

  const [plano, setPlano] = useState(null);
  const [gerandoPlano, setGerandoPlano] = useState(false);

  const ativoRef = useRef(true);

  // Na web, o backend devolve o token na URL após o login com Strava
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const params = new URLSearchParams(window.location.search);
    const tokenUrl = params.get('token');
    if (tokenUrl) {
      armazenamento.set('token', tokenUrl).then(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setToken(tokenUrl);
        setCarregando(false);
      });
    }
  }, []);

  useEffect(() => {
    armazenamento
      .get('token')
      .then((salvo) => {
        if (salvo) setToken(salvo);
      })
      .finally(() => setCarregando(false));
    return () => {
      ativoRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (token) {
      carregarDados(token);
      sincronizarSeNecessario();
    }
  }, [token]);

  async function carregarDados(tok) {
    const [pref, cid, tre, pla] = await Promise.allSettled([
      chamarApi('/preferencias/me', tok),
      chamarApi('/clima/cidade', tok),
      chamarApi('/treinos/me', tok),
      chamarApi('/planos/me', tok),
    ]);

    const valor = (r) => (r.status === 'fulfilled' && r.value.status === 200 ? r.value.dados : null);

    if (pref.status === 'fulfilled' && pref.value.status === 401) {
      setMensagem('Sessão expirada. Toque em Sair e entre de novo.');
      return;
    }

    const p = valor(pref);
    if (p) {
      setObjetivo(p.objetivo);
      setDiasSelecionados(p.dias_disponiveis);
      setDiasPorSemana(p.dias_por_semana);
    }

    const c = valor(cid);
    if (c?.cidade) {
      setCidadeSalva(c.cidade);
      setCidade(c.cidade);
    }

    const t = valor(tre);
    if (t) setTreinos(t);

    const pl = valor(pla);
    if (pl?.estado === 'pronto') setPlano(pl.resultado);
  }

  async function entrarComStrava() {
    setMensagem('');
    const web = Platform.OS === 'web';

    // Na web, o retorno é a própria página; no celular, o esquema do app
    const destino = web
      ? window.location.origin + window.location.pathname
      : Linking.createURL('autenticado');

    const url = `${API_URL}/auth/strava/login?destino=${encodeURIComponent(destino)}`;

    if (web) {
      window.location.href = url;
      return;
    }

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
    await armazenamento.set('token', queryParams.token);
    setToken(queryParams.token);
  }

  async function sair() {
    ativoRef.current = false;
    await armazenamento.remove('token');
    await armazenamento.remove('ultimaSincronizacao');
    setToken(null);
    setObjetivo(null);
    setDiasSelecionados([]);
    setCidade('');
    setCidadeSalva('');
    setPrevisao([]);
    setTreinos([]);
    setPlano(null);
    setGerandoPlano(false);
    setMensagem('');
    setAbaAtiva('inicio');
  }

  async function sincronizarSeNecessario() {
    const ultima = await armazenamento.get('ultimaSincronizacao');
    if (ultima && Date.now() - Number(ultima) < INTERVALO_SINCRONIZACAO_MS) return;
    await sincronizarTreinos({ automatico: true });
  }

  async function sincronizarTreinos({ automatico = false } = {}) {
    if (sincronizando) return;

    if (!automatico) {
      const ultima = await armazenamento.get('ultimaSincronizacao');
      if (ultima) {
        const faltam = INTERVALO_SINCRONIZACAO_MS - (Date.now() - Number(ultima));
        if (faltam > 0) {
          setMensagem(`Treinos já sincronizados. Tente de novo em ${Math.ceil(faltam / 60000)} min.`);
          return;
        }
      }
    }

    setSincronizando(true);
    setMensagem(automatico ? 'Atualizando treinos...' : 'Sincronizando treinos...');
    try {
      const { status, dados } = await chamarApi('/treinos/sincronizar', token, { method: 'POST' });
      if (status === 401) {
        setMensagem('Sessão expirada. Entre de novo.');
        return;
      }
      if (status === 200) {
        await armazenamento.set('ultimaSincronizacao', String(Date.now()));
        setMensagem(`${dados.novas} novas corridas (${dados.encontradas} no total)`);
        const lista = await chamarApi('/treinos/me', token);
        if (lista.status === 200) setTreinos(lista.dados);
      } else {
        setMensagem(`Erro ${status}: ${dados.detail || ''}`);
      }
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    } finally {
      setSincronizando(false);
    }
  }

  function alternarDia(codigo) {
    setDiasSelecionados((atual) =>
      atual.includes(codigo) ? atual.filter((d) => d !== codigo) : [...atual, codigo]
    );
  }

  async function salvarPreferencias() {
    if (!objetivo) return setMensagem('Escolha um objetivo.');
    if (diasSelecionados.length === 0) return setMensagem('Escolha pelo menos um dia disponível.');
    if (diasPorSemana > diasSelecionados.length) {
      return setMensagem('Dias por semana não pode ser maior que os dias disponíveis.');
    }

    setMensagem('Salvando rotina...');
    try {
      const { status, dados } = await chamarApi('/preferencias/me', token, {
        method: 'PUT',
        body: JSON.stringify({
          objetivo,
          dias_por_semana: diasPorSemana,
          dias_disponiveis: diasSelecionados,
        }),
      });
      if (status === 200) setMensagem('Rotina salva.');
      else setMensagem(`Erro ${status}: ${JSON.stringify(dados.detail ?? dados)}`);
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    }
  }

  async function salvarCidade() {
    const alvo = cidade.trim();
    if (alvo.length < 3) return setMensagem('Digite a cidade com o estado, por exemplo: Ivoti, RS.');

    setMensagem('Salvando cidade...');
    try {
      const { status, dados } = await chamarApi('/clima/cidade', token, {
        method: 'PUT',
        body: JSON.stringify({ cidade: alvo }),
      });
      if (status === 200) {
        setCidade(dados.cidade);
        setCidadeSalva(dados.cidade);
        setMensagem('Cidade salva no seu perfil.');
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
      const { status, dados } = await chamarApi('/clima/me', token);
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

  async function gerarPlano() {
    ativoRef.current = true;
    setGerandoPlano(true);
    setPlano(null);
    setMensagem('A IA está montando seu plano. Pode levar alguns minutos...');

    try {
      const { status, dados } = await chamarApi('/planos/gerar', token, { method: 'POST' });
      if (status !== 202) {
        setMensagem(`Erro ${status}: ${dados.detail || ''}`);
        return;
      }

      for (let i = 0; i < MAXIMO_CONSULTAS; i++) {
        await esperar(INTERVALO_CONSULTA_MS);
        if (!ativoRef.current) return;

        const consulta = await chamarApi('/planos/me', token);
        if (consulta.status === 401) {
          setMensagem('Sessão expirada. Entre de novo.');
          return;
        }
        if (consulta.dados.estado === 'pronto') {
          setPlano(consulta.dados.resultado);
          setMensagem('');
          return;
        }
        if (consulta.dados.estado === 'erro') {
          setMensagem(`Não foi possível gerar o plano: ${consulta.dados.mensagem}`);
          return;
        }
      }
      setMensagem('O plano demorou demais. Tente gerar de novo.');
    } catch (erro) {
      setMensagem(`Falha de conexão: ${erro.message}`);
    } finally {
      setGerandoPlano(false);
    }
  }

  const hoje = isoLocal();
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return isoLocal(d);
  });
  const treinos7 = treinos.filter((t) => dias7.includes(t.data));
  const kmSemana = treinos7.reduce((soma, t) => soma + t.distancia_km, 0);
  const proximaSessao = plano?.sessoes?.find((s) => s.data >= hoje && s.tipo !== 'descanso');

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={COR.amarelo} />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.centro}>
        <StatusBar style="light" />
        <LogoImagem largura={260} />
        <Text style={styles.subtitulo}>
          Treinos personalizados com base no seu histórico do Strava, na previsão do tempo e na sua rotina.
        </Text>
        <Pressable style={({ pressed }) => [styles.botaoPrimario, pressed && styles.pressionado]} onPress={entrarComStrava}>
          <Text style={styles.textoBotaoPrimario}>Entrar com Strava</Text>
        </Pressable>
        {mensagem ? <Text style={styles.aviso}>{mensagem}</Text> : null}
      </View>
    );
  }

  function renderInicio() {
    return (
      <>
        <View style={styles.cardDestaque}>
          <Text style={styles.rotuloEscuro}>Últimos 7 dias</Text>
          <Text style={styles.numeroGrande}>{kmSemana.toFixed(1)} km</Text>
          <Text style={styles.textoEscuro}>
            {treinos7.length} {treinos7.length === 1 ? 'corrida' : 'corridas'} registradas
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.rotulo}>Próximo treino</Text>
          {proximaSessao ? (
            <>
              <Text style={styles.tituloCard}>
                {formatarData(proximaSessao.data)} · {TIPOS[proximaSessao.tipo]?.nome}
              </Text>
              <Text style={styles.textoSuave}>{proximaSessao.distancia_km} km · {proximaSessao.descricao}</Text>
            </>
          ) : (
            <Text style={styles.textoSuave}>Nenhum plano ativo. Gere um na aba Plano.</Text>
          )}
        </View>

        <Text style={styles.secao}>Minha rotina</Text>
        <Text style={styles.rotuloPequeno}>Objetivo</Text>
        <View style={styles.linha}>
          {OBJETIVOS.map((item) => (
            <Chip key={item.codigo} ativo={objetivo === item.codigo} onPress={() => setObjetivo(item.codigo)}>
              {item.nome}
            </Chip>
          ))}
        </View>

        <Text style={styles.rotuloPequeno}>Dias disponíveis</Text>
        <View style={styles.linha}>
          {DIAS.map((dia) => (
            <Chip key={dia.codigo} ativo={diasSelecionados.includes(dia.codigo)} onPress={() => alternarDia(dia.codigo)}>
              {dia.nome}
            </Chip>
          ))}
        </View>

        <Text style={styles.rotuloPequeno}>Treinos por semana</Text>
        <View style={styles.linha}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} ativo={diasPorSemana === n} onPress={() => setDiasPorSemana(n)}>
              {String(n)}
            </Chip>
          ))}
        </View>

        <Pressable style={({ pressed }) => [styles.botaoPrimario, pressed && styles.pressionado]} onPress={salvarPreferencias}>
          <Text style={styles.textoBotaoPrimario}>Salvar rotina</Text>
        </Pressable>

        <Pressable style={styles.botaoSair} onPress={sair}>
          <Text style={styles.textoBotaoSair}>Sair da conta</Text>
        </Pressable>
      </>
    );
  }

  function renderTreinos() {
    return (
      <>
        <View style={styles.cardDestaque}>
          <Text style={styles.rotuloEscuro}>Histórico do Strava</Text>
          <Text style={styles.numeroGrande}>{treinos.length}</Text>
          <Text style={styles.textoEscuro}>corridas importadas (últimos 90 dias)</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.botaoPrimario, (pressed || sincronizando) && styles.pressionado]}
          onPress={() => sincronizarTreinos()}
          disabled={sincronizando}
        >
          {sincronizando ? (
            <ActivityIndicator color={COR.preto} />
          ) : (
            <Text style={styles.textoBotaoPrimario}>Sincronizar agora</Text>
          )}
        </Pressable>

        {treinos.length === 0 ? (
          <Text style={styles.textoSuave}>Nenhuma corrida ainda. Toque em sincronizar.</Text>
        ) : null}

        {treinos.map((t) => (
          <View key={t.id} style={styles.card}>
            <View style={styles.linhaTopo}>
              <Text style={styles.tituloCard}>{formatarData(t.data)}</Text>
              <Text style={styles.destaqueKm}>{t.distancia_km.toFixed(2)} km</Text>
            </View>
            <View style={styles.metricas}>
              <Metrica rotulo="Tempo" valor={formatarDuracao(t.duracao_min)} />
              <Metrica rotulo="Elevação" valor={t.elevacao_m != null ? `${Math.round(t.elevacao_m)} m` : '—'} />
              <Metrica rotulo="FC média" valor={t.fc_media != null ? `${t.fc_media} bpm` : '—'} />
            </View>
          </View>
        ))}
      </>
    );
  }

  function renderClima() {
    return (
      <>
        <Text style={styles.secao}>Sua cidade</Text>
        <TextInput
          style={styles.campo}
          placeholder="Ex.: Ivoti, RS"
          placeholderTextColor={COR.suave}
          value={cidade}
          onChangeText={setCidade}
          autoCorrect={false}
        />
        <Pressable style={({ pressed }) => [styles.botaoPrimario, pressed && styles.pressionado]} onPress={salvarCidade}>
          <Text style={styles.textoBotaoPrimario}>Salvar cidade</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.botaoSecundario, pressed && styles.pressionado]} onPress={buscarClima}>
          <Text style={styles.textoBotaoSecundario}>Ver previsão</Text>
        </Pressable>

        {cidadeSalva ? <Text style={styles.textoSuave}>Cidade atual: {cidadeSalva}</Text> : null}

        {previsao.map((dia) => (
          <View key={dia.data} style={styles.card}>
            <View style={styles.linhaTopo}>
              <Text style={styles.tituloCard}>{NOMES_DIAS[dia.dia_semana]} · {formatarData(dia.data)}</Text>
              <Text style={styles.iconeGrande}>{dia.status === 'previsto' ? iconeClima(dia.prob_chuva_pct) : '·'}</Text>
            </View>
            {dia.status === 'previsto' ? (
              <View style={styles.metricas}>
                <Metrica rotulo="Chuva" valor={`${dia.prob_chuva_pct}%`} />
                <Metrica rotulo="Temp." valor={`${dia.temp_media_c} °C`} />
                <Metrica rotulo="Céu" valor={dia.descricao} />
              </View>
            ) : (
              <Text style={styles.textoSuave}>Previsão ainda não disponível (a previsão cobre 5 dias).</Text>
            )}
          </View>
        ))}
      </>
    );
  }

  function renderPlano() {
    return (
      <>
        <Pressable
          style={({ pressed }) => [styles.botaoPrimario, (pressed || gerandoPlano) && styles.pressionado]}
          onPress={gerarPlano}
          disabled={gerandoPlano}
        >
          {gerandoPlano ? (
            <ActivityIndicator color={COR.preto} />
          ) : (
            <Text style={styles.textoBotaoPrimario}>{plano ? 'Gerar novo plano' : 'Gerar plano da semana'}</Text>
          )}
        </Pressable>

        {plano ? (
          <>
            {plano.alertas.length > 0 ? (
              <View style={styles.alertaCard}>
                <Text style={styles.alertaTitulo}>⚠ Atenção à carga de treino</Text>
                {plano.alertas.map((alerta, i) => (
                  <Text key={i} style={styles.alertaTexto}>• {alerta}</Text>
                ))}
                <Text style={styles.alertaAviso}>Este aviso não substitui acompanhamento médico.</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.rotulo}>Risco {plano.nivel_risco}</Text>
              <Text style={styles.textoCorpo}>{plano.resumo}</Text>
            </View>

            {plano.sessoes.map((s) => {
              const tipo = TIPOS[s.tipo] ?? TIPOS.rodagem;
              return (
                <View key={s.data} style={[styles.cardSessao, { borderLeftColor: tipo.cor }]}>
                  <View style={styles.linhaTopo}>
                    <Text style={styles.tituloCard}>{diaDaSemana(s.data)} · {formatarData(s.data)}</Text>
                    <View style={[styles.etiqueta, { backgroundColor: tipo.cor }]}>
                      <Text style={styles.etiquetaTexto}>{tipo.nome}</Text>
                    </View>
                  </View>
                  {s.tipo !== 'descanso' ? (
                    <Text style={styles.numeroMedio}>{s.distancia_km} km</Text>
                  ) : null}
                  <Text style={styles.textoCorpo}>{s.descricao}</Text>
                  <Text style={styles.textoSuave}>{s.justificativa}</Text>
                  <Text style={styles.clima}>{s.clima}</Text>
                </View>
              );
            })}
          </>
        ) : (
          <Text style={styles.textoSuave}>
            Seu plano aparece aqui. Ele usa seu histórico, sua rotina e a previsão do tempo.
          </Text>
        )}
      </>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <LogoImagem largura={110} />
        <Text style={styles.subCabecalho}>{cidadeSalva || 'Defina sua cidade na aba Clima'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        {abaAtiva === 'inicio' && renderInicio()}
        {abaAtiva === 'treinos' && renderTreinos()}
        {abaAtiva === 'clima' && renderClima()}
        {abaAtiva === 'plano' && renderPlano()}
      </ScrollView>

      {mensagem ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTexto}>{mensagem}</Text>
        </View>
      ) : null}

      <View style={styles.barraAbas}>
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.codigo;
          return (
            <Pressable key={aba.codigo} style={styles.aba} onPress={() => setAbaAtiva(aba.codigo)}>
              <Text style={[styles.abaIcone, ativa && styles.abaAtiva]}>{aba.icone}</Text>
              <Text style={[styles.abaTexto, ativa && styles.abaAtiva]}>{aba.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Chip({ ativo, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, ativo && styles.chipAtivo]}>
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{children}</Text>
    </Pressable>
  );
}

function Metrica({ rotulo, valor }) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaValor}>{valor}</Text>
      <Text style={styles.metricaRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COR.fundo, paddingTop: 56 },
  centro: {
    flex: 1,
    backgroundColor: COR.fundo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  cabecalho: { paddingHorizontal: 24, paddingBottom: 4, alignItems: 'flex-start' },
  subCabecalho: { color: COR.suave, fontSize: 14, marginTop: -4 },
  subtitulo: { color: COR.branco, fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 24, marginBottom: 36 },
  conteudo: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },

  card: {
    backgroundColor: COR.superficie,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COR.borda,
  },
  cardDestaque: {
    backgroundColor: COR.amarelo,
    borderRadius: 20,
    padding: 20,
  },
  cardSessao: {
    backgroundColor: COR.superficie,
    borderRadius: 18,
    padding: 18,
    borderLeftWidth: 4,
  },
  rotulo: { color: COR.suave, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  rotuloEscuro: { color: COR.preto, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, opacity: 0.7 },
  rotuloPequeno: { color: COR.suave, fontSize: 13, marginTop: 10 },
  numeroGrande: { color: COR.preto, fontSize: 40, fontWeight: '800' },
  textoEscuro: { color: COR.preto, fontSize: 14, marginTop: 4 },
  numeroMedio: { color: COR.branco, fontSize: 26, fontWeight: '800', marginVertical: 4 },
  tituloCard: { color: COR.branco, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  textoSuave: { color: COR.suave, fontSize: 14, marginTop: 4, lineHeight: 20 },
  textoCorpo: { color: COR.branco, fontSize: 15, lineHeight: 22, marginTop: 4 },
  clima: { color: COR.suave, fontSize: 13, marginTop: 8 },
  secao: { color: COR.branco, fontSize: 20, fontWeight: '700', marginTop: 16 },

  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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

  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  destaqueKm: { color: COR.amarelo, fontSize: 18, fontWeight: '800' },
  iconeGrande: { fontSize: 24 },
  metricas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  metrica: { flex: 1, alignItems: 'flex-start' },
  metricaValor: { color: COR.branco, fontSize: 15, fontWeight: '700' },
  metricaRotulo: { color: COR.suave, fontSize: 12, marginTop: 2 },

  etiqueta: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  etiquetaTexto: { color: COR.preto, fontSize: 12, fontWeight: '700' },

  alertaCard: {
    backgroundColor: COR.amarelo,
    borderRadius: 18,
    padding: 18,
  },
  alertaTitulo: { color: COR.preto, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  alertaTexto: { color: COR.preto, fontSize: 14, lineHeight: 20, marginTop: 2 },
  alertaAviso: { color: COR.preto, fontSize: 12, marginTop: 10, fontStyle: 'italic' },

  campo: {
    backgroundColor: COR.superficie,
    borderColor: COR.borda,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COR.branco,
    fontSize: 16,
    marginTop: 8,
  },

  botaoPrimario: {
    backgroundColor: COR.amarelo,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotaoPrimario: { color: COR.preto, fontSize: 16, fontWeight: '800' },
  botaoSecundario: {
    borderColor: COR.amarelo,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoBotaoSecundario: { color: COR.amarelo, fontSize: 15, fontWeight: '700' },
  botaoSair: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  textoBotaoSair: { color: COR.suave, fontSize: 14 },
  pressionado: { opacity: 0.75 },

  banner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: COR.superficie2,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COR.amarelo,
  },
  bannerTexto: { color: COR.branco, fontSize: 14 },

  barraAbas: {
    flexDirection: 'row',
    backgroundColor: COR.superficie,
    borderTopWidth: 1,
    borderTopColor: COR.borda,
    paddingTop: 10,
    paddingBottom: 26,
  },
  aba: { flex: 1, alignItems: 'center', gap: 2 },
  abaIcone: { color: COR.suave, fontSize: 20 },
  abaTexto: { color: COR.suave, fontSize: 12 },
  abaAtiva: { color: COR.amarelo, fontWeight: '700' },

  aviso: { color: COR.suave, marginTop: 20, textAlign: 'center' },
});