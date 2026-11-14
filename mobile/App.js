// mobile/App.js
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import LogoImagem from './LogoImagem';
import Aviso from './src/components/Aviso';
import TelaLogin from './src/telas/TelaLogin';
import TelaInicio from './src/telas/TelaInicio';
import TelaRotina from './src/telas/TelaRotina';
import TelaTreinos from './src/telas/TelaTreinos';
import TelaClima from './src/telas/TelaClima';
import TelaPlano from './src/telas/TelaPlano';
import TelaAderencia from './src/telas/TelaAderencia';
import { API_URL, ABAS, COR, OBJETIVOS, INTERVALO_CONSULTA_MS, MAXIMO_CONSULTAS, INTERVALO_SINCRONIZACAO_MS } from './src/constants/tema';
import { estilos as e } from './src/constants/estilos';
import { armazenamento } from './src/api/armazenamento';
import { chamarApi } from './src/api/config';
import { isoLocal } from './src/utils/datas';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Avisos de sucesso e de aviso somem sozinhos; carregando e erro ficam até o usuário fechar
const DURACAO_AVISO_MS = 6000;

export default function App() {
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('inicio');
  const [aderenciaAberta, setAderenciaAberta] = useState(false);
  const [rotinaAberta, setRotinaAberta] = useState(false);

  const [objetivo, setObjetivo] = useState(null);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [diasPorSemana, setDiasPorSemana] = useState(3);

  const [cidade, setCidade] = useState('');
  const [cidadeSalva, setCidadeSalva] = useState('');
  const [previsao, setPrevisao] = useState([]);
  const [carregandoPrevisao, setCarregandoPrevisao] = useState(false);

  const [treinos, setTreinos] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);

  const [plano, setPlano] = useState(null);
  const [gerandoPlano, setGerandoPlano] = useState(false);

  const ativoRef = useRef(true);

  function avisar(tipo, texto, opcoes = {}) {
    const duracao = opcoes.duracao ?? (tipo === 'sucesso' || tipo === 'aviso' ? DURACAO_AVISO_MS : null);
    setAviso({
      id: Date.now() + Math.random(),
      tipo,
      texto,
      titulo: opcoes.titulo,
      tentar: opcoes.tentar,
      duracao,
    });
  }

  // Só fecha o aviso se ele ainda for o mesmo (evita fechar um aviso novo por engano)
  function fecharAviso(id) {
    setAviso((atual) => (atual && atual.id === id ? null : atual));
  }

  function erroDeConexao(tentar) {
    avisar('erro', 'Verifique sua conexão com a internet e tente de novo.', { titulo: 'Sem conexão', tentar });
  }

  function trocarAba(codigo) {
    setAbaAtiva(codigo);
    setRotinaAberta(false);
    setAderenciaAberta(false);
  }

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
      avisar('erro', 'Sua sessão expirou. Toque em Sair da conta e entre de novo.', { titulo: 'Sessão expirada' });
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
    setAviso(null);
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
      avisar('aviso', 'O login foi cancelado. Toque em Entrar com Strava para tentar de novo.');
      return;
    }
    const { queryParams } = Linking.parse(resultado.url);
    if (queryParams.erro) {
      avisar('aviso', 'Você não autorizou o RunAI no Strava. Para usar o app, autorize o acesso.');
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
    setAviso(null);
    setAbaAtiva('inicio');
    setAderenciaAberta(false);
    setRotinaAberta(false);
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
          avisar('aviso', `Seus treinos já foram atualizados. Tente de novo em ${Math.ceil(faltam / 60000)} min.`);
          return;
        }
      }
    }

    setSincronizando(true);
    avisar('carregando', automatico ? 'Atualizando seus treinos...' : 'Buscando corridas no Strava...', {
      titulo: 'Sincronizando',
    });
    try {
      const { status, dados } = await chamarApi('/treinos/sincronizar', token, { method: 'POST' });
      if (status === 401) {
        avisar('erro', 'Sua sessão expirou. Toque em Sair da conta e entre de novo.', { titulo: 'Sessão expirada' });
        return;
      }
      if (status === 200) {
        await armazenamento.set('ultimaSincronizacao', String(Date.now()));
        avisar('sucesso', `${dados.novas} novas corridas (${dados.encontradas} no total).`, { titulo: 'Treinos atualizados' });
        const lista = await chamarApi('/treinos/me', token);
        if (lista.status === 200) setTreinos(lista.dados);
      } else {
        avisar('erro', `Não foi possível sincronizar agora. ${dados.detail || ''}`.trim(), {
          titulo: 'Erro ao sincronizar',
          tentar: () => sincronizarTreinos(),
        });
      }
    } catch (erro) {
      erroDeConexao(() => sincronizarTreinos());
    } finally {
      setSincronizando(false);
    }
  }

  function alternarDia(codigo) {
    const novos = diasSelecionados.includes(codigo)
      ? diasSelecionados.filter((d) => d !== codigo)
      : [...diasSelecionados, codigo];
    setDiasSelecionados(novos);
    setDiasPorSemana(Math.max(1, novos.length));
  }

  async function salvarPreferencias() {
    if (!objetivo) return avisar('aviso', 'Escolha um objetivo antes de salvar.');
    if (diasSelecionados.length === 0) return avisar('aviso', 'Escolha pelo menos um dia disponível.');
    if (diasPorSemana > diasSelecionados.length) {
      return avisar('aviso', 'O número de treinos não pode ser maior que os dias disponíveis.');
    }

    avisar('carregando', 'Salvando sua rotina...');
    try {
      const { status, dados } = await chamarApi('/preferencias/me', token, {
        method: 'PUT',
        body: JSON.stringify({
          objetivo,
          dias_por_semana: diasPorSemana,
          dias_disponiveis: diasSelecionados,
        }),
      });
      if (status === 200) {
        setRotinaAberta(false);
        avisar('sucesso', 'Sua rotina foi salva.');
      } else {
        avisar('erro', `Não foi possível salvar: ${JSON.stringify(dados.detail ?? dados)}`, { titulo: 'Erro ao salvar' });
      }
    } catch (erro) {
      erroDeConexao(() => salvarPreferencias());
    }
  }

  async function salvarCidade() {
    const alvo = cidade.trim();
    if (alvo.length < 3) return avisar('aviso', 'Digite a cidade com o estado, por exemplo: Ivoti, RS.');

    avisar('carregando', 'Salvando sua cidade...');
    try {
      const { status, dados } = await chamarApi('/clima/cidade', token, {
        method: 'PUT',
        body: JSON.stringify({ cidade: alvo }),
      });
      if (status === 200) {
        setCidade(dados.cidade);
        setCidadeSalva(dados.cidade);
        avisar('sucesso', `${dados.cidade} foi salva no seu perfil.`);
      } else {
        avisar('erro', dados.detail || 'Não foi possível salvar a cidade.', { titulo: 'Cidade não encontrada' });
      }
    } catch (erro) {
      erroDeConexao(() => salvarCidade());
    }
  }

  async function buscarClima() {
    setCarregandoPrevisao(true);
    setAviso(null);
    try {
      const { status, dados } = await chamarApi('/clima/me', token);
      if (status === 200) {
        setPrevisao(dados.dias);
      } else {
        setPrevisao([]);
        avisar('erro', dados.detail || 'Não foi possível carregar a previsão.', {
          titulo: 'Previsão indisponível',
          tentar: () => buscarClima(),
        });
      }
    } catch (erro) {
      setPrevisao([]);
      erroDeConexao(() => buscarClima());
    } finally {
      setCarregandoPrevisao(false);
    }
  }

  async function gerarPlano() {
    ativoRef.current = true;
    setGerandoPlano(true);
    setPlano(null);
    avisar('carregando', 'A IA está montando seu plano. Pode levar alguns minutos.', { titulo: 'Gerando seu plano' });

    try {
      const { status, dados } = await chamarApi('/planos/gerar', token, { method: 'POST' });
      if (status !== 202) {
        avisar('erro', dados.detail || 'Não foi possível iniciar a geração do plano.', {
          titulo: 'Erro ao gerar',
          tentar: () => gerarPlano(),
        });
        return;
      }

      for (let i = 0; i < MAXIMO_CONSULTAS; i++) {
        await esperar(INTERVALO_CONSULTA_MS);
        if (!ativoRef.current) return;

        const consulta = await chamarApi('/planos/me', token);
        if (consulta.status === 401) {
          avisar('erro', 'Sua sessão expirou. Toque em Sair da conta e entre de novo.', { titulo: 'Sessão expirada' });
          return;
        }
        if (consulta.dados.estado === 'pronto') {
          setPlano(consulta.dados.resultado);
          avisar('sucesso', 'Seu plano está pronto. Role para ver os treinos.', { titulo: 'Plano pronto' });
          return;
        }
        if (consulta.dados.estado === 'erro') {
          avisar('erro', consulta.dados.mensagem, { titulo: 'Não foi possível gerar o plano', tentar: () => gerarPlano() });
          return;
        }
      }
      avisar('erro', 'O plano demorou mais que o esperado. Tente gerar de novo.', {
        titulo: 'Demorou demais',
        tentar: () => gerarPlano(),
      });
    } catch (erro) {
      erroDeConexao(() => gerarPlano());
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

  const nomeObjetivo = OBJETIVOS.find((o) => o.codigo === objetivo)?.nome;
  const resumoRotina = objetivo
    ? `${nomeObjetivo} · ${diasPorSemana} ${diasPorSemana === 1 ? 'treino' : 'treinos'} por semana`
    : 'Rotina ainda não definida.';

  const rotinaFeita = !!objetivo && diasSelecionados.length > 0;
  const cidadeFeita = !!cidadeSalva;
  const treinosFeitos = treinos.length > 0;
  const planoFeito = !!plano;

  // Aba do próximo passo ainda não feito: recebe um ponto amarelo na barra
  const proximoPasso = !rotinaFeita ? 'inicio' : !cidadeFeita ? 'clima' : !treinosFeitos ? 'treinos' : !planoFeito ? 'plano' : null;

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={COR.amarelo} />
      </View>
    );
  }

  if (!token) {
    return (
      <TelaLogin
        onEntrar={entrarComStrava}
        aviso={aviso}
        onFecharAviso={() => fecharAviso(aviso?.id)}
      />
    );
  }

  const naInicio = abaAtiva === 'inicio';
  const mostrarRotina = naInicio && rotinaAberta;
  const mostrarAderencia = naInicio && aderenciaAberta && !rotinaAberta;
  const telaEspecial = mostrarRotina || mostrarAderencia;

  function renderConteudo() {
    if (mostrarRotina) {
      return (
        <TelaRotina
          objetivo={objetivo}
          onObjetivo={setObjetivo}
          diasSelecionados={diasSelecionados}
          onAlternarDia={alternarDia}
          diasPorSemana={diasPorSemana}
          onDiasPorSemana={setDiasPorSemana}
          onSalvar={salvarPreferencias}
          aviso={aviso}
          onFecharAviso={() => fecharAviso(aviso?.id)}
        />
      );
    }
    if (mostrarAderencia) {
      return <TelaAderencia token={token} />;
    }
    return null;
  }

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <View style={styles.cabecalho}>
        <LogoImagem largura={110} altura={34} />
        <Text style={styles.cidade} numberOfLines={1}>
          {cidadeSalva || 'Sem cidade'}
        </Text>
      </View>

      {telaEspecial ? (
        <View style={styles.area}>{renderConteudo()}</View>
      ) : (
        <ScrollView contentContainerStyle={e.conteudo} keyboardShouldPersistTaps="handled">
          {naInicio && (
            <TelaInicio
              kmSemana={kmSemana}
              qtdTreinos7={treinos7.length}
              proximaSessao={proximaSessao}
              resumoRotina={resumoRotina}
              rotinaFeita={rotinaFeita}
              cidadeFeita={cidadeFeita}
              treinosFeitos={treinosFeitos}
              planoFeito={planoFeito}
              onAbrirRotina={() => setRotinaAberta(true)}
              onIrClima={() => trocarAba('clima')}
              onIrTreinos={() => trocarAba('treinos')}
              onIrPlano={() => trocarAba('plano')}
              onAbrirAderencia={() => setAderenciaAberta(true)}
              onSair={sair}
            />
          )}
          {abaAtiva === 'treinos' && <TelaTreinos treinos={treinos} />}
          {abaAtiva === 'clima' && (
            <TelaClima
              cidade={cidade}
              onCidade={setCidade}
              cidadeSalva={cidadeSalva}
              previsao={previsao}
              carregandoPrevisao={carregandoPrevisao}
              onSalvarCidade={salvarCidade}
              onBuscarClima={buscarClima}
            />
          )}
          {abaAtiva === 'plano' && (
            <TelaPlano
              token={token}
              plano={plano}
              gerandoPlano={gerandoPlano}
              onGerarPlano={gerarPlano}
            />
          )}
        </ScrollView>
      )}

      {aviso && !mostrarRotina ? (
        <View style={styles.avisoWrapper}>
          <Aviso
            key={aviso.id}
            tipo={aviso.tipo}
            titulo={aviso.titulo}
            texto={aviso.texto}
            onTentarNovamente={aviso.tentar}
            duracao={aviso.duracao}
            onFechar={() => fecharAviso(aviso.id)}
          />
        </View>
      ) : null}

      <View style={e.barraAbas}>
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.codigo;
          const destaque = proximoPasso === aba.codigo;
          return (
            <Pressable key={aba.codigo} style={e.aba} onPress={() => trocarAba(aba.codigo)}>
              <View>
                <Text style={[e.abaIcone, ativa && e.abaAtiva]}>{aba.icone}</Text>
                {destaque ? <View style={styles.ponto} /> : null}
              </View>
              <Text style={[e.abaTexto, ativa && e.abaAtiva]}>{aba.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COR.fundo, paddingTop: 40 },
  centro: { flex: 1, backgroundColor: COR.fundo, alignItems: 'center', justifyContent: 'center', padding: 28 },
  area: { flex: 1 },
  avisoWrapper: { marginHorizontal: 20, marginBottom: 8 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  cidade: {
    color: COR.suave,
    fontSize: 13,
    maxWidth: '50%',
    textAlign: 'right',
  },
  ponto: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COR.amarelo,
  },
});