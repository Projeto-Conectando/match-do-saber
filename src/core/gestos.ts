import type { Presenca } from './partida';

export interface Ponto { x: number; y: number; visibility?: number }
export type Pose = Ponto[];
export type Gesto = 'direita' | 'esquerda' | 'maosParaCima';
export interface LeituraGesto { presenca: Presenca; inclinacao: number; gestos: Gesto[] }
export interface Interpretador { ler(pose: Pose | null, tMs: number): LeituraGesto; calibrar(): void }

export const CONFIG_GESTOS = {
  limiar: 0.12,
  zonaRetorno: 0.05,
  zonaCalibracao: 0.1,
  permanenciaLadoMs: 300,
  permanenciaMaosMs: 500,
};

const NARIZ = 0, OMBRO_E = 11, OMBRO_D = 12, PUNHO_E = 15, PUNHO_D = 16;

/** Centro do tronco do ponto de vista do jogador (imagem espelhada) e largura dos ombros. */
function medir(p: Pose): { cx: number; largura: number } {
  const a = p[OMBRO_E]!, b = p[OMBRO_D]!;
  return { cx: 1 - (a.x + b.x) / 2, largura: Math.abs(a.x - b.x) };
}

export function escolherJogador(poses: Pose[]): Pose | null {
  let melhor: Pose | null = null;
  let nota = -Infinity;
  for (const p of poses) {
    const { cx, largura } = medir(p);
    const n = largura * (1 - Math.abs(cx - 0.5));
    if (n > nota) { nota = n; melhor = p; }
  }
  return melhor;
}

export function criarInterpretador(cfg = CONFIG_GESTOS): Interpretador {
  let centro: number | null = null;
  let ultimoCx = 0.5;
  let lado: { gesto: 'direita' | 'esquerda'; desde: number } | null = null;
  let travadoLado = false;
  let maosDesde: number | null = null;
  let travadoMaos = false;

  return {
    calibrar() {
      centro = ultimoCx;
    },
    ler(pose, tMs) {
      if (!pose) {
        lado = null;
        maosDesde = null;
        return { presenca: { presente: false, centralizado: false }, inclinacao: 0, gestos: [] };
      }
      const gestos: Gesto[] = [];
      const { cx } = medir(pose);
      ultimoCx = cx;
      const d = cx - (centro ?? 0.5);
      const inclinacao = Math.max(-1, Math.min(1, d / cfg.limiar));

      if (travadoLado) {
        if (Math.abs(d) < cfg.zonaRetorno) travadoLado = false;
      } else {
        const dir = d > cfg.limiar ? 'direita' : d < -cfg.limiar ? 'esquerda' : null;
        if (!dir) lado = null;
        else if (lado?.gesto !== dir) lado = { gesto: dir, desde: tMs };
        else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
          gestos.push(dir);
          travadoLado = true;
          lado = null;
        }
      }

      const nariz = pose[NARIZ]!.y;
      const maosAcima = pose[PUNHO_E]!.y < nariz && pose[PUNHO_D]!.y < nariz;
      if (!maosAcima) {
        maosDesde = null;
        travadoMaos = false;
      } else if (maosDesde === null) {
        maosDesde = tMs;
      } else if (!travadoMaos && tMs - maosDesde >= cfg.permanenciaMaosMs) {
        gestos.push('maosParaCima');
        travadoMaos = true;
      }

      return {
        presenca: { presente: true, centralizado: Math.abs(cx - 0.5) < cfg.zonaCalibracao },
        inclinacao,
        gestos,
      };
    },
  };
}
