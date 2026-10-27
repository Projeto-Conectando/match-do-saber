import type { Som } from '../core/sons';

interface Nota { freq: number; ate?: number; duracao: number; tipo: OscillatorType; volume: number; atraso?: number }

const SONS: Record<Som, Nota[]> = {
  deslizar: [{ freq: 900, ate: 300, duracao: 0.18, tipo: 'sine', volume: 0.15 }],
  acerto: [
    { freq: 660, duracao: 0.12, tipo: 'triangle', volume: 0.2 },
    { freq: 990, duracao: 0.2, tipo: 'triangle', volume: 0.2, atraso: 0.1 },
  ],
  erro: [{ freq: 220, ate: 140, duracao: 0.35, tipo: 'sawtooth', volume: 0.12 }],
};

export interface Tocador { tocar(som: Som): void; desbloquear(): void }

export function criarTocador(): Tocador {
  let ctx: AudioContext | null = null;
  const obter = (): AudioContext | null => {
    if (ctx) return ctx;
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
    return ctx;
  };
  return {
    // O navegador só libera o áudio depois de uma interação (clique ou tecla).
    desbloquear() {
      const c = obter();
      if (c?.state === 'suspended') c.resume().catch(() => {});
    },
    tocar(som) {
      const c = obter();
      if (!c) return;
      for (const n of SONS[som]) {
        const inicio = c.currentTime + (n.atraso ?? 0);
        const osc = c.createOscillator();
        const ganho = c.createGain();
        osc.type = n.tipo;
        osc.frequency.setValueAtTime(n.freq, inicio);
        if (n.ate) osc.frequency.exponentialRampToValueAtTime(n.ate, inicio + n.duracao);
        ganho.gain.setValueAtTime(n.volume, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.001, inicio + n.duracao);
        osc.connect(ganho);
        ganho.connect(c.destination);
        osc.start(inicio);
        osc.stop(inicio + n.duracao);
      }
    },
  };
}
