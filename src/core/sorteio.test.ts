import { describe, expect, it } from 'vitest';
import { sortear } from './sorteio';
import type { Noticia, Veredito } from './types';

const n = (id: string, veredito: Veredito): Noticia => ({
  id, veredito, titulo: id, descricao: '', saibaMais: '', imagem: '', explicacao: '', tecnica: 'fonte', fonteUrl: '',
});
const lote = (v: number, f: number) => [
  ...Array.from({ length: v }, (_, i) => n(`v${i}`, 'verdadeira')),
  ...Array.from({ length: f }, (_, i) => n(`f${i}`, 'falsa')),
];
function rngSeed(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
}
const conta = (cards: Noticia[]) => ({
  v: cards.filter((c) => c.veredito === 'verdadeira').length,
  f: cards.filter((c) => c.veredito === 'falsa').length,
  unicos: new Set(cards.map((c) => c.id)).size,
});

describe('sortear', () => {
  it('AC-6.1: 5 verdadeiras + 5 falsas sem repetição', () => {
    expect(conta(sortear(lote(8, 9), rngSeed(1)))).toEqual({ v: 5, f: 5, unicos: 10 });
  });
  it('AC-6.1: ordem aleatória (sementes diferentes geram ordens diferentes)', () => {
    const a = sortear(lote(8, 9), rngSeed(1)).map((c) => c.id).join();
    const b = sortear(lote(8, 9), rngSeed(2)).map((c) => c.id).join();
    expect(a).not.toBe(b);
  });
  it('AC-6.2: completa com o outro lado', () => {
    expect(conta(sortear(lote(3, 12), rngSeed(3)))).toEqual({ v: 3, f: 7, unicos: 10 });
  });
  it('AC-6.3: com menos de 10, usa todas', () => {
    expect(conta(sortear(lote(2, 4), rngSeed(4)))).toEqual({ v: 2, f: 4, unicos: 6 });
  });
  it('AC-6.4: sem notícias, partida vazia', () => {
    expect(sortear([], rngSeed(5))).toEqual([]);
  });
});
