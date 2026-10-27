import { useEffect, useRef, useState } from 'react';
import { parseCatalogo } from '../core/catalogo';
import { TEMPOS, pontos, tecnicasDaPartida } from '../core/partida';
import type { Noticia } from '../core/types';
import { CameraPreview } from './CameraPreview';
import { TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';
import { useJogo } from './useJogo';
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
  const { estado, despachar, camera, videoRef, inclinacaoRef, poseRef } = useJogo(noticias);
  const cardRef = useRef<HTMLElement>(null);
  const cardSaindoRef = useRef<HTMLElement>(null); // fora do laço de inclinação

  // Inclinação do card acompanhando o corpo (AC-2.3), fora do ciclo de render.
  useEffect(() => {
    let raf = 0;
    const aplicar = () => {
      const el = cardRef.current;
      if (el) el.style.transform = `translateX(${inclinacaoRef.current * 60}px) rotate(${inclinacaoRef.current * 12}deg)`;
      raf = requestAnimationFrame(aplicar);
    };
    raf = requestAnimationFrame(aplicar);
    return () => cancelAnimationFrame(raf);
  }, [inclinacaoRef]);

  let tela;
  switch (estado.tela) {
    case 'espera':
      tela = <TelaEspera semNoticias={noticias.length === 0} camera={camera} />;
      break;
    case 'calibracao':
      tela = <TelaCalibracao progresso={estado.centradoMs / TEMPOS.calibracaoMs} />;
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
      tela = <TelaResumo pontos={pontos(estado.partida)} total={estado.partida.cards.length} tecnicas={tecnicasDaPartida(estado.partida)} />;
      break;
  }

  return (
    <div className={s.app}>
      {tela}
      {camera === 'indisponivel' && estado.tela !== 'espera' && (
        <p className={s.faixa}>Câmera indisponível — use as setas</p>
      )}
      <CameraPreview videoRef={videoRef} poseRef={poseRef} visivel={camera === 'ativa'} />
    </div>
  );
}
