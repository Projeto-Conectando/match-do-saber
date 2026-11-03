// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Estado, Partida } from '../core/partida';
import type { Noticia } from '../core/types';
import { useFotoPartida } from './useFotoPartida';

const FOTO = 'data:image/jpeg;base64,AAA';
const noticia = (i: number): Noticia => ({
  id: `n${i}`, veredito: 'falsa', tecnica: 'fonte', titulo: `n${i}`, descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '',
});
const partida: Partida = { cards: Array.from({ length: 10 }, (_, i) => noticia(i)), resultados: [], entrada: 'corpo' };

const espera: Estado = { tela: 'espera' };
const calibracao: Estado = { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };
const card = (indice: number): Estado => ({ tela: 'card', partida, indice, restanteMs: 15000, saibaMais: false, ausenteMs: null });
const feedback = (indice: number, restanteMs = 3250): Estado => ({ tela: 'feedback', partida, indice, restanteMs, resposta: 'verdadeira' });
const resumo: Estado = { tela: 'resumo', partida };

/** Joga uma partida de 10 cards inteira, do card 0 ao resumo, passando cada estado ao hook. */
function jogar(rerender: (p: { estado: Estado }) => void) {
  for (let i = 0; i < 10; i++) {
    rerender({ estado: card(i) });
    rerender({ estado: feedback(i) });
  }
  rerender({ estado: resumo });
}

function montar(ligada: boolean, capturar: () => string | null) {
  return renderHook(({ estado }: { estado: Estado }) => useFotoPartida(estado, ligada, capturar), { initialProps: { estado: espera } });
}

describe('useFotoPartida (FR-13)', () => {
  it('AC-13.1: captura uma vez, no feedback do card do meio (índice 4), e a foto dura até o resumo', () => {
    const capturar = vi.fn(() => FOTO);
    const { result, rerender } = montar(true, capturar);
    for (let i = 0; i < 4; i++) {
      rerender({ estado: card(i) });
      rerender({ estado: feedback(i) });
    }
    expect(capturar).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
    rerender({ estado: card(4) });
    expect(capturar).not.toHaveBeenCalled();
    rerender({ estado: feedback(4) });
    expect(capturar).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(FOTO);
    for (let i = 5; i < 10; i++) {
      rerender({ estado: card(i) });
      rerender({ estado: feedback(i) });
    }
    rerender({ estado: resumo });
    expect(capturar).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(FOTO);
  });

  it('AC-13.1: ticks do mesmo feedback (estado novo, mesma tela e card) não capturam de novo', () => {
    const capturar = vi.fn(() => FOTO);
    const { rerender } = montar(true, capturar);
    rerender({ estado: card(4) });
    rerender({ estado: feedback(4) });
    rerender({ estado: feedback(4, 2000) });
    rerender({ estado: feedback(4, 1000) });
    expect(capturar).toHaveBeenCalledTimes(1);
  });

  it('AC-13.3: com "Foto no resumo" desligada, nunca captura e não há foto', () => {
    const capturar = vi.fn(() => FOTO);
    const { result, rerender } = montar(false, capturar);
    jogar(rerender);
    expect(capturar).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('AC-13.3: captura que falha (null) deixa o resumo sem foto', () => {
    const capturar = vi.fn(() => null);
    const { result, rerender } = montar(true, capturar);
    jogar(rerender);
    expect(capturar).toHaveBeenCalledTimes(1);
    expect(result.current).toBeNull();
  });

  it.each([
    ['espera (Sair/Esc ou ausência)', espera],
    ['calibração (Enter com câmera)', calibracao],
    ['card 0 (Enter sem câmera)', card(0)],
  ])('AC-13.4: depois do resumo com foto, %s apaga a foto', (_, proximo) => {
    const capturar = vi.fn(() => FOTO);
    const { result, rerender } = montar(true, capturar);
    jogar(rerender);
    expect(result.current).toBe(FOTO);
    rerender({ estado: proximo });
    expect(result.current).toBeNull();
  });

  it('AC-13.4: partida encerrada antes do resumo (Esc no card 7) não leva a foto adiante', () => {
    const capturar = vi.fn(() => FOTO);
    const { result, rerender } = montar(true, capturar);
    for (let i = 0; i < 8; i++) {
      rerender({ estado: card(i) });
      rerender({ estado: feedback(i) });
    }
    expect(result.current).toBe(FOTO);
    rerender({ estado: espera });
    expect(result.current).toBeNull();
  });
});
