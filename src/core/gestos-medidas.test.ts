import { describe, expect, it } from 'vitest';
import { CONFIG_GESTOS, medirCabeca, medirMaos, type Pose } from './gestos';

function base(): Pose {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
  p[0] = { x: 0.5, y: 0.33, visibility: 1 };
  p[7] = { x: 0.55, y: 0.3, visibility: 1 };
  p[8] = { x: 0.45, y: 0.3, visibility: 1 };
  p[11] = { x: 0.6, y: 0.45, visibility: 1 };
  p[12] = { x: 0.4, y: 0.45, visibility: 1 };
  p[15] = { x: 0.65, y: 0.7, visibility: 1 };
  p[16] = { x: 0.35, y: 0.7, visibility: 1 };
  return p;
}

describe('medidas compartilhadas', () => {
  it('medirMaos: punho acima do ombro menos a margem', () => {
    const p = base();
    expect(medirMaos(p)).toEqual({ direita: false, esquerda: false });
    p[16] = { ...p[16]!, y: 0.45 - CONFIG_GESTOS.margemMaoOmbro - 0.01 };
    expect(medirMaos(p)).toEqual({ direita: true, esquerda: false });
    p[15] = { ...p[15]!, y: 0.45 - CONFIG_GESTOS.margemMaoOmbro + 0.01 };   // dentro da margem: não conta
    expect(medirMaos(p).esquerda).toBe(false);
  });
  it('medirCabeca: inclinação em graus pelas orelhas e queixo pelo nariz', () => {
    const p = base();
    expect(medirCabeca(p).rollGraus).toBeCloseTo(0, 5);
    expect(medirCabeca(p).queixo).toBeCloseTo(-0.3, 5);
    p[7] = { ...p[7]!, y: 0.3 - Math.tan((20 * Math.PI) / 180) * 0.05 };
    p[8] = { ...p[8]!, y: 0.3 + Math.tan((20 * Math.PI) / 180) * 0.05 };
    expect(medirCabeca(p).rollGraus).toBeCloseTo(20, 3);
  });
});
