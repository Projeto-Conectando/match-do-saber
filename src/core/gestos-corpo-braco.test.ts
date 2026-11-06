import { describe, expect, it } from 'vitest';
import { criarInterpretador, type Pose } from './gestos';

/**
 * Pose sintética do modo Corpo em coordenadas cruas da câmera (L = 0,2).
 * `cxJ` = centro do tronco do ponto de vista do jogador; `d`/`e` = deslocamento lateral
 * de cada punho em L a partir do meio do corpo (+ = própria direita do jogador);
 * `maosAcima` põe os dois punhos acima do nariz.
 */
function pose(o: { cxJ?: number; d?: number; e?: number; maosAcima?: boolean } = {}): Pose {
  const cxJ = o.cxJ ?? 0.5;
  const cx = 1 - cxJ;
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.8, visibility: 1 }));
  p[0] = { x: cx, y: 0.33, visibility: 1 };
  p[11] = { x: cx + 0.1, y: 0.45, visibility: 1 };
  p[12] = { x: cx - 0.1, y: 0.45, visibility: 1 };
  const cruX = (desloc: number) => 1 - (cxJ + desloc * 0.2);
  const yMao = o.maosAcima ? 0.15 : 0.6;
  p[16] = { x: cruX(o.d ?? 0.6), y: yMao, visibility: 1 };
  p[15] = { x: cruX(o.e ?? -0.6), y: yMao, visibility: 1 };
  return p;
}
const seq = (i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) => passos.flatMap(([p, t]) => i.ler(p, t).gestos);

function calibrado() {
  const i = criarInterpretador('corpo');
  i.ler(pose(), 0);
  i.calibrar();
  return i;
}

describe('modo Corpo v8.1.0: braço para o lado (AC-2.7)', () => {
  it('punho direito além de 1,2 L por ~300 ms = "direita", com o tronco no centro', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ d: 1.5 }), 0], [pose({ d: 1.5 }), 200]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.5 }), 300]])).toEqual(['direita']);
  });
  it('punho esquerdo além de 1,2 L para a esquerda = "esquerda"', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ e: -1.5 }), 0], [pose({ e: -1.5 }), 300]])).toEqual(['esquerda']);
  });
  it('abaixo do limite (1,1 L) não escolhe', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ d: 1.1 }), 0], [pose({ d: 1.1 }), 500], [pose({ d: 1.1 }), 1000]])).toEqual([]);
  });
  it('funciona sem calibração', () => {
    const i = criarInterpretador('corpo');
    expect(seq(i, [[pose({ d: 1.5 }), 0], [pose({ d: 1.5 }), 300]])).toEqual(['direita']);
  });
});

describe('modo Corpo v8.1.0: sinais contrários não escolhem (AC-2.8)', () => {
  it('um punho para cada lado não escolhe', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ d: 1.5, e: -1.5 }), 0], [pose({ d: 1.5, e: -1.5 }), 500], [pose({ d: 1.5, e: -1.5 }), 1000]])).toEqual([]);
  });
  it('tronco para a direita e braço para a esquerda não escolhe', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ cxJ: 0.7, e: -1.5 }), 0], [pose({ cxJ: 0.7, e: -1.5 }), 500], [pose({ cxJ: 0.7, e: -1.5 }), 1000]])).toEqual([]);
  });
  it('dois punhos acima do nariz com um braço para o lado = só "saiba mais"', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ maosAcima: true, d: 1.5 }), 0], [pose({ maosAcima: true, d: 1.5 }), 300], [pose({ maosAcima: true, d: 1.5 }), 600]])).toEqual(['maosParaCima']);
  });
});

describe('modo Corpo v8.1.0: retorno ao centro com os punhos perto do corpo (AC-2.4)', () => {
  it('depois de escolher pelo braço, só escolhe de novo com os punhos a menos de 0,9 L', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ d: 1.5 }), 0], [pose({ d: 1.5 }), 300]])).toEqual(['direita']);
    expect(seq(i, [[pose({ d: 1.5 }), 800], [pose({ d: 1.5 }), 1300]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.0 }), 1400], [pose({ d: 1.5 }), 1500], [pose({ d: 1.5 }), 1800], [pose({ d: 1.5 }), 2500]])).toEqual([]);
    expect(seq(i, [[pose({ d: 0.6 }), 2600], [pose({ d: 1.5 }), 2700], [pose({ d: 1.5 }), 3000]])).toEqual(['direita']);
  });
  it('depois de escolher pelo tronco, o tronco no centro com o braço estendido não libera', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ cxJ: 0.7 }), 0], [pose({ cxJ: 0.7 }), 300]])).toEqual(['direita']);
    expect(seq(i, [[pose({ d: 1.5 }), 400], [pose({ d: 1.5 }), 700], [pose({ d: 1.5 }), 1200]])).toEqual([]);
    expect(seq(i, [[pose(), 1300], [pose({ cxJ: 0.7 }), 1400], [pose({ cxJ: 0.7 }), 1700]])).toEqual(['direita']);
  });
});

describe('modo Corpo v8.1.0: tronco e braço no mesmo lado', () => {
  it('trocar de tronco para braço no mesmo lado não reinicia a contagem', () => {
    const i = calibrado();
    expect(seq(i, [[pose({ cxJ: 0.7 }), 0], [pose({ cxJ: 0.7 }), 150]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.5 }), 200], [pose({ d: 1.5 }), 300]])).toEqual(['direita']);
  });
});
