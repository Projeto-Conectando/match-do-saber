import type { Gesto, MedidaCabeca, MedidaMaos, Pose } from './gestos';
import type { ModoJogo } from './modos';

/** Pontos do MediaPipe Pose guardados no diagnóstico (lados anatômicos do jogador). */
export const PONTOS_DIAGNOSTICO = { nariz: 0, orelhaE: 7, orelhaD: 8, ombroE: 11, ombroD: 12, punhoE: 15, punhoD: 16 } as const;
export type NomePonto = keyof typeof PONTOS_DIAGNOSTICO;
export interface PontoMedido { x: number; y: number; conf: number }

export interface Amostra {
  t: number;
  dtMs: number;
  /** null quando não houve detecção (sem câmera ou menu aberto sem rastreador). */
  deteccaoMs: number | null;
  pessoas: number;
  tela: string;
  modo: ModoJogo;
  pontos: Partial<Record<NomePonto, PontoMedido>>;
  medidas: { maos?: MedidaMaos; cabeca?: MedidaCabeca };
  gestos: Gesto[];
}

const arred = (v: number) => Math.round(v * 1000) / 1000;

export function extrairPontos(pose: Pose | null): Amostra['pontos'] {
  if (!pose) return {};
  const out: Amostra['pontos'] = {};
  for (const [nome, i] of Object.entries(PONTOS_DIAGNOSTICO) as [NomePonto, number][]) {
    const p = pose[i];
    if (p) out[nome] = { x: arred(p.x), y: arred(p.y), conf: arred(p.visibility ?? 0) };
  }
  return out;
}

export interface Resumo {
  fps: number;
  deteccaoMediaMs: number | null;
  deteccaoMaxMs: number | null;
  gestosRecentes: Gesto[];
}

export interface Registro {
  adicionar(a: Amostra): void;
  resumo(agora: number): Resumo;
  ultima(): Amostra | null;
  exportar(): { versao: 1; geradoEm: string; amostras: Amostra[] };
}

export function criarRegistro(janelaMs = 60_000, agoraIso: () => string = () => new Date().toISOString()): Registro {
  let amostras: Amostra[] = [];
  return {
    adicionar(a) {
      amostras.push(a);
      const limite = a.t - janelaMs;
      if (amostras[0]!.t < limite) amostras = amostras.filter((x) => x.t >= limite);
    },
    resumo(agora) {
      const ultimoSegundo = amostras.filter((a) => a.t > agora - 1000);
      const det = ultimoSegundo.map((a) => a.deteccaoMs).filter((d): d is number => d !== null);
      return {
        fps: ultimoSegundo.length,
        deteccaoMediaMs: det.length ? Math.round(det.reduce((s, d) => s + d, 0) / det.length) : null,
        deteccaoMaxMs: det.length ? Math.round(Math.max(...det)) : null,
        gestosRecentes: amostras.filter((a) => a.t > agora - 5000).flatMap((a) => a.gestos),
      };
    },
    ultima() {
      return amostras.at(-1) ?? null;
    },
    exportar() {
      return { versao: 1, geradoEm: agoraIso(), amostras: [...amostras] };
    },
  };
}
