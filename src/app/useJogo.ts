import { useEffect, useReducer, useRef, useState } from 'react';
import { extrairPontos, type Registro } from '../core/diagnostico';
import { criarInterpretador, escolherJogador, medirCabeca, medirMaos, type Gesto, type Pose } from '../core/gestos';
import { CONFIG_PADRAO, type Configuracoes } from '../core/modos';
import { ESTADO_INICIAL, reduzir, type Contexto, type Estado, type Evento } from '../core/partida';
import { dtDoQuadro } from '../core/relogio';
import type { Noticia } from '../core/types';
import { abrirCamera, criarRastreador, type Rastreador } from './rastreador';

export type StatusCamera = 'carregando' | 'ativa' | 'negada' | 'indisponivel';

const EVENTO_DO_GESTO: Record<Gesto, Evento> = {
  direita: { tipo: 'escolha', resposta: 'verdadeira' },
  esquerda: { tipo: 'escolha', resposta: 'falsa' },
  maosParaCima: { tipo: 'saibaMais' },
};

const EVENTO_DA_TECLA: Record<string, Evento | undefined> = {
  ArrowRight: EVENTO_DO_GESTO.direita,
  ArrowLeft: EVENTO_DO_GESTO.esquerda,
  ArrowUp: EVENTO_DO_GESTO.maosParaCima,
  Enter: { tipo: 'enter' },
  Escape: { tipo: 'sair' }, // FR-10
};

export function useJogo(noticias: Noticia[], config: Configuracoes = CONFIG_PADRAO, pausado = false, registro?: Registro) {
  const [camera, setCamera] = useState<StatusCamera>('carregando');
  const ctx = useRef<Contexto>({ noticias, rng: Math.random, cameraAtiva: false, tempoCardMs: config.tempoCardS * 1000, ignorarAusencia: config.modo !== 'corpo' });
  ctx.current = { noticias, rng: Math.random, cameraAtiva: camera === 'ativa', tempoCardMs: config.tempoCardS * 1000, ignorarAusencia: config.modo !== 'corpo' };
  const [estado, despachar] = useReducer((s: Estado, e: Evento) => reduzir(s, e, ctx.current), ESTADO_INICIAL);

  const videoRef = useRef<HTMLVideoElement>(null);
  const inclinacaoRef = useRef(0);
  const poseRef = useRef<Pose | null>(null);
  const interp = useRef(criarInterpretador(config.modo));
  const pausadoRef = useRef(pausado);
  pausadoRef.current = pausado;
  // Só para o modo de diagnóstico (FR-12): o laço lê a tela e o modo atuais sem recriar o efeito.
  const diagRef = useRef({ registro, tela: estado.tela as string, modo: config.modo });
  diagRef.current = { registro, tela: estado.tela, modo: config.modo };
  const rastreador = useRef<Rastreador | null>(null);
  const telaAnterior = useRef(estado.tela);

  // O modo só muda na tela de espera (FR-9), então trocar o interpretador aqui não afeta uma partida.
  useEffect(() => {
    interp.current = criarInterpretador(config.modo);
  }, [config.modo]);

  // Calibra o centro ao sair da calibração para o primeiro card.
  useEffect(() => {
    if (telaAnterior.current === 'calibracao' && estado.tela === 'card') interp.current.calibrar();
    telaAnterior.current = estado.tela;
  }, [estado.tela]);

  // Câmera + modelo. Seguro para o duplo efeito do StrictMode: tudo que chega depois do cleanup é descartado.
  useEffect(() => {
    const abortar = new AbortController();
    const cancelado = () => abortar.signal.aborted;
    let stream: MediaStream | null = null;
    let meu: Rastreador | null = null;
    (async () => {
      const video = videoRef.current;
      if (!video || !navigator.mediaDevices?.getUserMedia) return setCamera('negada');
      try {
        stream = await abrirCamera(video, abortar.signal);
      } catch {
        if (!cancelado()) setCamera('negada');
        return;
      }
      if (cancelado()) return;
      try {
        const r = await criarRastreador();
        if (cancelado()) return r.fechar();
        meu = r;
        rastreador.current = r;
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (cancelado()) return;
          rastreador.current = null;
          setCamera('indisponivel');
        });
        setCamera('ativa');
      } catch {
        if (!cancelado()) setCamera('indisponivel');
      }
    })();
    return () => {
      abortar.abort();
      stream?.getTracks().forEach((t) => t.stop());
      if (meu) {
        if (rastreador.current === meu) rastreador.current = null;
        meu.fechar();
      }
    };
  }, []);

  // Loop único: tick por quadro.
  useEffect(() => {
    let raf = 0;
    let anterior = performance.now();
    const quadro = (agora: number) => {
      const dtMs = dtDoQuadro(agora, anterior);
      anterior = agora;
      const video = videoRef.current;
      const r = rastreador.current;
      if (r && video && video.readyState >= 2) {
        const antesDeteccao = performance.now();
        const poses = r.detectar(video, agora);
        const deteccaoMs = performance.now() - antesDeteccao;
        const pose = escolherJogador(poses);
        poseRef.current = pose;
        const leitura = interp.current.ler(pose, agora);
        // Com o menu "Configurações" aberto, a câmera não gera presença nem gestos.
        inclinacaoRef.current = pausadoRef.current ? 0 : leitura.inclinacao;
        despachar({ tipo: 'tick', dtMs, presenca: pausadoRef.current ? null : leitura.presenca });
        if (!pausadoRef.current) for (const g of leitura.gestos) despachar(EVENTO_DO_GESTO[g]);
        const d = diagRef.current;
        d.registro?.adicionar({
          t: agora, dtMs, deteccaoMs, pessoas: poses.length, tela: d.tela, modo: d.modo,
          pontos: extrairPontos(pose),
          medidas: pose ? { maos: medirMaos(pose), cabeca: medirCabeca(pose) } : {},
          gestos: pausadoRef.current ? [] : leitura.gestos,
        });
      } else {
        poseRef.current = null;
        inclinacaoRef.current = 0;
        despachar({ tipo: 'tick', dtMs, presenca: null });
        const d = diagRef.current;
        d.registro?.adicionar({ t: agora, dtMs, deteccaoMs: null, pessoas: 0, tela: d.tela, modo: d.modo, pontos: {}, medidas: {}, gestos: [] });
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Teclado (FR-3).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const ev = EVENTO_DA_TECLA[e.key];
      if (ev) {
        e.preventDefault();
        despachar(ev);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  return { estado, despachar, camera, videoRef, inclinacaoRef, poseRef };
}
