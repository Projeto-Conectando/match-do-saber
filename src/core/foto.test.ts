import { describe, expect, it } from 'vitest';
import { indiceFoto } from './foto';

describe('indiceFoto (AC-13.1: card ⌈M/2⌉, base 0)', () => {
  it.each([
    [10, 4], // 5º card
    [9, 4],
    [6, 2],
    [1, 0],
  ])('partida de %i cards → índice %i', (total, indice) => {
    expect(indiceFoto(total)).toBe(indice);
  });
});
