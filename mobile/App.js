// mobile/App.js
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import LogoImagem from './LogoImagem';
import TelaLogin from './src/telas/TelaLogin';
import TelaInicio from './src/telas/TelaInicio';
import TelaTreinos from './src/telas/TelaTreinos';
import TelaClima from './src/telas/TelaClima';
import TelaPlano from './src/telas/TelaPlano';
import { API_URL, ABAS, COR, INTERVALO_CONSULTA_MS, MAXIMO_CONSULTAS, INTERVALO_SINCRONIZACAO_MS } from './src/constants/tema';
import { estilos as e } from './src/constants/estilos';
import { armazenamento } from './src/api/armazenamento';
import { chamarApi } from './src/api/config';
import { isoLocal } from './src/utils/datas';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Cálculos da tela inicial
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
    return <TelaLogin onEntrar={entrarComStrava} mensagem={mensagem} />;
  }

  return (
    <View style={e.app}>
      <StatusBar style="light" />

      <View style={e.cabecalho}>
        <LogoImagem largura={110} />
        <Text style={e.subCabecalho}>{cidadeSalva || 'Defina sua cidade na aba Clima'}</Text>
      </View>

      <ScrollView contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
        {abaAtiva === 'inicio' && (
          <TelaInicio
            kmSemana={kmSemana}
            qtdTreinos7={treinos7.length}
            proximaSessao={proximaSessao}
            objetivo={objetivo}
            onObjetivo={setObjetivo}
            diasSelecionados={diasSelecionados}
            onAlternarDia={alternarDia}
            diasPorSemana={diasPorSemana}
            onDiasPorSemana={setDiasPorSemana}
            onSalvarRotina={salvarPreferencias}
            onSair={sair}
          />
        )}
        {abaAtiva === 'treinos' && (
          <TelaTreinos
            treinos={treinos}
            sincronizando={sincronizando}
            onSincronizar={() => sincronizarTreinos()}
          />
        )}
        {abaAtiva === 'clima' && (
          <TelaClima
            cidade={cidade}
            onCidade={setCidade}
            cidadeSalva={cidadeSalva}
            previsao={previsao}
            onSalvarCidade={salvarCidade}
            onBuscarClima={buscarClima}
          />
        )}
        {abaAtiva === 'plano' && (
          <TelaPlano plano={plano} gerandoPlano={gerandoPlano} onGerarPlano={gerarPlano} />
        )}
      </ScrollView>

      {mensagem ? (
        <View style={e.banner}>
          <Text style={e.bannerTexto}>{mensagem}</Text>
        </View>
      ) : null}

      <View style={e.barraAbas}>
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.codigo;
          return (
            <Pressable key={aba.codigo} style={e.aba} onPress={() => setAbaAtiva(aba.codigo)}>
              <Text style={[e.abaIcone, ativa && e.abaAtiva]}>{aba.icone}</Text>
              <Text style={[e.abaTexto, ativa && e.abaAtiva]}>{aba.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, backgroundColor: COR.fundo, alignItems: 'center', justifyContent: 'center', padding: 28 },
});