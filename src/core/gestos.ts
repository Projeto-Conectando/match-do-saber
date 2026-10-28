import type { ModoJogo } from './modos';
import type { Presenca } from './partida';

export interface Ponto { x: number; y: number; visibility?: number }
export type Pose = Ponto[];
/** 'maosParaCima' é o gesto de "saiba mais" do modo ativo (no modo Cabeça, queixo para cima). */
export type Gesto = 'direita' | 'esquerda' | 'maosParaCima';
export interface LeituraGesto { presenca: Presenca; inclinacao: number; gestos: Gesto[] }
export interface Interpretador { ler(pose: Pose | null, tMs: number): LeituraGesto; calibrar(): void }

export const CONFIG_GESTOS = {
  limiar: 0.12,
  zonaRetorno: 0.05,
  zonaCalibracao: 0.1,
  permanenciaLadoMs: 300,
  permanenciaMaosMs: 500,
  margemMaoOmbro: 0.05,
  limiarCabecaGraus: 15,
  retornoCabecaGraus: 6,
  limiarQueixo: 0.25,
};
export type ConfigGestos = typeof CONFIG_GESTOS;
type Config = ConfigGestos;

const NARIZ = 0, ORELHA_E = 7, ORELHA_D = 8, OMBRO_E = 11, OMBRO_D = 12, PUNHO_E = 15, PUNHO_D = 16;
const AUSENTE: LeituraGesto = { presenca: { presente: false, centralizado: false }, inclinacao: 0, gestos: [] };

/** Centro do tronco do ponto de vista do jogador (imagem espelhada) e largura dos ombros. */
function medir(p: Pose): { cx: number; largura: number } {
  const a = p[OMBRO_E]!, b = p[OMBRO_D]!;
  return { cx: 1 - (a.x + b.x) / 2, largura: Math.abs(a.x - b.x) };
}

function presenca(cx: number, cfg: Config): Presenca {
  return { presente: true, centralizado: Math.abs(cx - 0.5) < cfg.zonaCalibracao };
}

export interface MedidaMaos { direita: boolean; esquerda: boolean }

/** Mão acima do ombro pela regra do modo Mão (AC-9.7). Lados anatômicos do jogador. */
export function medirMaos(pose: Pose, cfg: Config = CONFIG_GESTOS): MedidaMaos {
  const acima = (punho: number, ombro: number) => pose[punho]!.y < pose[ombro]!.y - cfg.margemMaoOmbro;
  return { direita: acima(PUNHO_D, OMBRO_D), esquerda: acima(PUNHO_E, OMBRO_E) };
}

export interface MedidaCabeca { rollGraus: number; queixo: number }

/** Inclinação (graus; + = própria direita) e queixo (+ = olhando para cima) do modo Cabeça (AC-9.10, AC-9.11). */
export function medirCabeca(pose: Pose): MedidaCabeca {
  const oe = pose[ORELHA_E]!, od = pose[ORELHA_D]!, nariz = pose[NARIZ]!;
  const dist = Math.max(Math.abs(oe.x - od.x), 1e-6);
  // Orelha direita mais baixa que a esquerda = cabeça inclinada para a própria direita.
  const rollGraus = (Math.atan2(od.y - oe.y, dist) * 180) / Math.PI;
  // Nariz subindo em relação às orelhas = queixo para cima.
  const queixo = ((oe.y + od.y) / 2 - nariz.y) / dist;
  return { rollGraus, queixo };
}

const limitar = (v: number) => Math.max(-1, Math.min(1, v));

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

/** Detecta um deslocamento lateral mantido por `permanenciaLadoMs`, com retorno obrigatório ao centro. */
function criarLado(limiar: number, retorno: number, cfg: Config) {
  let lado: { gesto: 'direita' | 'esquerda'; desde: number } | null = null;
  let travado = false;
  return {
    zerar() { lado = null; },
    ler(d: number, tMs: number): Gesto | null {
      if (travado) {
        if (Math.abs(d) < retorno) travado = false;
        return null;
      }
      const dir = d > limiar ? 'direita' : d < -limiar ? 'esquerda' : null;
      if (!dir) lado = null;
      else if (lado?.gesto !== dir) lado = { gesto: dir, desde: tMs };
      else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
        travado = true;
        lado = null;
        return dir;
      }
      return null;
    },
  };
}

/** Dispara uma vez quando `ativo` fica verdadeiro por `ms`; rearma quando `ativo` volta a falso. */
function criarGatilho(ms: number) {
  let desde: number | null = null;
  let disparado = false;
  return {
    zerar() { desde = null; },
    ler(ativo: boolean, tMs: number): boolean {
      if (!ativo) { desde = null; disparado = false; return false; }
      if (desde === null) { desde = tMs; return false; }
      if (!disparado && tMs - desde >= ms) { disparado = true; return true; }
      return false;
    },
  };
}

function interpretadorCorpo(cfg: Config): Interpretador {
  let centro: number | null = null;
  let ultimoCx = 0.5;
  const lado = criarLado(cfg.limiar, cfg.zonaRetorno, cfg);
  const maos = criarGatilho(cfg.permanenciaMaosMs);
  return {
    calibrar() { centro = ultimoCx; },
    ler(pose, tMs) {
      if (!pose) { lado.zerar(); maos.zerar(); return AUSENTE; }
      const gestos: Gesto[] = [];
      const { cx } = medir(pose);
      ultimoCx = cx;
      const d = cx - (centro ?? 0.5);
      const g = lado.ler(d, tMs);
      if (g) gestos.push(g);
      const nariz = pose[NARIZ]!.y;
      if (maos.ler(pose[PUNHO_E]!.y < nariz && pose[PUNHO_D]!.y < nariz, tMs)) gestos.push('maosParaCima');
      return { presenca: presenca(cx, cfg), inclinacao: limitar(d / cfg.limiar), gestos };
    },
  };
}

function interpretadorMao(cfg: Config): Interpretador {
  let lado: { gesto: 'direita' | 'esquerda'; desde: number } | null = null;
  let travadoLado = false;
  const ambas = criarGatilho(cfg.permanenciaMaosMs);
  return {
    calibrar() {},
    ler(pose, tMs) {
      if (!pose) { lado = null; ambas.zerar(); return AUSENTE; }
      const gestos: Gesto[] = [];
      const { cx } = medir(pose);
      const { direita: dir, esquerda: esq } = medirMaos(pose, cfg);

      if (ambas.ler(dir && esq, tMs)) {
        gestos.push('maosParaCima');
        travadoLado = true; // baixar uma mão por vez depois do "saiba mais" não escolhe
      }
      if (!dir && !esq) travadoLado = false;

      if (travadoLado || dir === esq) {
        lado = null;
      } else {
        const g = dir ? 'direita' : 'esquerda';
        if (lado?.gesto !== g) lado = { gesto: g, desde: tMs };
        else if (tMs - lado.desde >= cfg.permanenciaLadoMs) {
          gestos.push(g);
          travadoLado = true;
          lado = null;
        }
      }
      return { presenca: presenca(cx, cfg), inclinacao: 0, gestos };
    },
  };
}

function interpretadorCabeca(cfg: Config): Interpretador {
  let ultimoRoll = 0;
  let ultimoQueixo: number | null = null;
  let rollCentro = 0;
  let queixoCentro: number | null = null;
  const lado = criarLado(cfg.limiarCabecaGraus, cfg.retornoCabecaGraus, cfg);
  const queixo = criarGatilho(cfg.permanenciaMaosMs);
  return {
    calibrar() {
      rollCentro = ultimoRoll;
      queixoCentro = ultimoQueixo;
    },
    ler(pose, tMs) {
      if (!pose) { lado.zerar(); queixo.zerar(); return AUSENTE; }
      const gestos: Gesto[] = [];
      const { cx } = medir(pose);
      const { rollGraus: roll, queixo: q } = medirCabeca(pose);
      ultimoRoll = roll;
      ultimoQueixo = q;
      if (queixoCentro === null) queixoCentro = q;

      const d = roll - rollCentro;
      const g = lado.ler(d, tMs);
      if (g) gestos.push(g);
      if (queixo.ler(q - queixoCentro > cfg.limiarQueixo, tMs)) gestos.push('maosParaCima');
      return { presenca: presenca(cx, cfg), inclinacao: limitar(d / cfg.limiarCabecaGraus), gestos };
    },
  };
}

export function criarInterpretador(modo: ModoJogo = 'corpo', cfg: Config = CONFIG_GESTOS): Interpretador {
  if (modo === 'mao') return interpretadorMao(cfg);
  if (modo === 'cabeca') return interpretadorCabeca(cfg);
  return interpretadorCorpo(cfg);
}
