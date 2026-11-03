import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseCatalogo } from '../core/catalogo';
import { criarRegistro } from '../core/diagnostico';
import { TEMPOS, pontos, tecnicasDaPartida, type Estado } from '../core/partida';
import type { Noticia } from '../core/types';
import { baixarJson } from './baixar';
import { CameraPreview } from './CameraPreview';
import { capturarQuadro } from './foto';
import { PainelDiagnostico } from './PainelDiagnostico';
import { BotaoSair, MenuConfiguracoes, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';
import { useConfiguracoes } from './useConfiguracoes';
import { useFotoPartida } from './useFotoPartida';
import { useJogo } from './useJogo';
import { useSons } from './useSons';
import s from './App.module.css';

export function App() {
  const [noticias, setNoticias] = useState<Noticia[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}content/noticias.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => setNoticias(parseCatalogo(j).noticias))
      .catch((e) => {
        console.error(e);
        setErro(true);
      });
  }, []);

  if (erro) return <main className={s.centro}><p className={s.aviso}>Conecte à internet uma vez para baixar o jogo</p></main>;
  if (!noticias) return <main className={s.centro}><p>Carregando…</p></main>;
  return <Jogo noticias={noticias} />;
}

function Jogo({ noticias }: { noticias: Noticia[] }) {
  const telaRef = useRef<Estado['tela']>('espera');
  const podeAbrirMenu = useCallback(() => telaRef.current === 'espera', []);
  const cfg = useConfiguracoes(podeAbrirMenu);
  // Modo de diagnóstico (FR-12): só com ?diagnostico no endereço.
  const diagnostico = useMemo(() => (new URLSearchParams(window.location.search).has('diagnostico') ? criarRegistro() : undefined), []);
  const { estado, despachar, camera, videoRef, poseRef } = useJogo(noticias, cfg.config, cfg.menuAberto, diagnostico);
  telaRef.current = estado.tela;
  useSons(estado, cfg.config.som);
  // Foto do resumo (FR-13): só com a câmera ativa; fica só neste estado React.
  const foto = useFotoPartida(estado, cfg.config.foto, () =>
    camera === 'ativa' && videoRef.current ? capturarQuadro(videoRef.current) : null);
  const cardRef = useRef<HTMLElement>(null);
  const cardSaindoRef = useRef<HTMLElement>(null); // card que está saindo (AC-2.1/AC-2.2)

  let tela;
  switch (estado.tela) {
    case 'espera':
      tela = (
        <TelaEspera
          semNoticias={noticias.length === 0}
          camera={camera}
          config={cfg.config}
          onAbrirMenu={cfg.abrir}
          onIniciar={() => despachar({ tipo: 'enter' })}
        />
      );
      break;
    case 'calibracao':
      tela = <TelaCalibracao progresso={estado.centradoMs / TEMPOS.calibracaoMs} modo={cfg.config.modo} />;
      break;
    case 'card':
      tela = (
        <TelaCard
          key={estado.indice}
          noticia={estado.partida.cards[estado.indice]!}
          restanteMs={estado.restanteMs}
          saibaMais={estado.saibaMais}
          ausente={estado.ausenteMs !== null}
          pontos={pontos(estado.partida)}
          modo={cfg.config.modo}
          totalMs={cfg.config.tempoCardS * 1000}
          cardRef={cardRef}
          onArrastar={(lado) => despachar({ tipo: 'escolha', resposta: lado === 'direita' ? 'verdadeira' : 'falsa' })}
        />
      );
      break;
    case 'feedback': {
      const noticia = estado.partida.cards[estado.indice]!;
      // Após uma escolha, os primeiros TEMPOS.saidaMs do feedback são a saída do card; depois, 3 s de resultado.
      const saindo = estado.resposta !== null && estado.restanteMs > TEMPOS.feedbackMs;
      tela = saindo ? (
        <TelaCard
          key={estado.indice}
          noticia={noticia}
          restanteMs={0}
          saibaMais={false}
          ausente={false}
          pontos={pontos(estado.partida)}
          modo={cfg.config.modo}
          totalMs={cfg.config.tempoCardS * 1000}
          saida={estado.resposta === 'verdadeira' ? 'direita' : 'esquerda'}
          cardRef={cardSaindoRef}
          onArrastar={() => {}}
        />
      ) : (
        <TelaFeedback noticia={noticia} resultado={estado.partida.resultados[estado.indice]!} pontos={pontos(estado.partida)} />
      );
      break;
    }
    case 'resumo':
      tela = <TelaResumo pontos={pontos(estado.partida)} total={estado.partida.cards.length} tecnicas={tecnicasDaPartida(estado.partida)} foto={foto} />;
      break;
  }

  return (
    <div className={s.app}>
      {tela}
      {camera === 'indisponivel' && estado.tela !== 'espera' && (
        <p className={s.faixa}>Câmera indisponível — use as setas</p>
      )}
      {estado.tela !== 'espera' && <BotaoSair onSair={() => despachar({ tipo: 'sair' })} />}
      {cfg.menuAberto && (
        <MenuConfiguracoes config={cfg.config} itemDestacado={cfg.itemDestacado} onDefinir={cfg.definir} onFechar={cfg.fechar} />
      )}
      {diagnostico && <PainelDiagnostico registro={diagnostico} onBaixar={() => baixarJson(diagnostico.exportar())} />}
      <CameraPreview videoRef={videoRef} poseRef={poseRef} visivel={camera === 'ativa'} />
    </div>
  );
}
