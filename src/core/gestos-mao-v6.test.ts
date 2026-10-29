import { describe, expect, it } from 'vitest';
import { criarInterpretador, type Pose } from './gestos';

/**
 * Pose sintética do modo Mão em coordenadas cruas da câmera, com ombros fixos
 * (L = 0,2; centro do jogador 0,5). `d`/`e` = deslocamento lateral de cada punho em L
 * (+ = própria direita do jogador); `dAlto`/`eAlto` = punho acima do ombro.
 */
function pose(o: { d?: number; e?: number; dAlto?: boolean; eAlto?: boolean } = {}): Pose {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.8, visibility: 1 }));
  p[0] = { x: 0.5, y: 0.33, visibility: 1 };
  p[7] = { x: 0.55, y: 0.3, visibility: 1 };
  p[8] = { x: 0.45, y: 0.3, visibility: 1 };
  p[11] = { x: 0.6, y: 0.45, visibility: 1 };
  p[12] = { x: 0.4, y: 0.45, visibility: 1 };
  const cruX = (desloc: number) => 1 - (0.5 + desloc * 0.2);
  p[16] = { x: cruX(o.d ?? 0.75), y: o.dAlto ? 0.3 : 0.6, visibility: 1 };
  p[15] = { x: cruX(o.e ?? -0.75), y: o.eAlto ? 0.3 : 0.6, visibility: 1 };
  return p;
}
const seq = (i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) => passos.flatMap(([p, t]) => i.ler(p, t).gestos);

describe('modo Mão v6.0.0: duas mãos para um lado (AC-9.19)', () => {
  it('as duas mãos além da linha do ombro direito por ~300 ms = "direita"', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 0], [pose({ d: 1.0, e: 0.6 }), 200]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 300]])).toEqual(['direita']);
  });
  it('para o lado esquerdo = "esquerda"', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: -0.6, e: -1.0 }), 0], [pose({ d: -0.6, e: -1.0 }), 300]])).toEqual(['esquerda']);
  });
  it('uma mão só além do ombro (braços abertos, mãos baixas) não escolhe', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 1.0, e: -1.0 }), 0], [pose({ d: 1.0, e: -1.0 }), 1000]])).toEqual([]);
    expect(seq(i, [[pose({ d: 1.0, e: 0.2 }), 1100], [pose({ d: 1.0, e: 0.2 }), 2000]])).toEqual([]);
  });
});

describe('modo Mão v6.0.0: arrastar do centro para o lado (AC-9.20)', () => {
  it('mão direita do centro para a direita (≥ 1 L em até 0,8 s) = "direita"', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.1 }), 0], [pose({ d: 0.6 }), 200], [pose({ d: 1.15 }), 400]])).toEqual(['direita']);
  });
  it('qualquer mão: a esquerda arrastando para a esquerda = "esquerda"', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ e: -0.1 }), 0], [pose({ e: -1.2 }), 500]])).toEqual(['esquerda']);
  });
  it('arraste lento demais (> 0,8 s) ou curto demais (< 1 L) não escolhe', () => {
    const lento = criarInterpretador('mao');
    expect(seq(lento, [[pose({ d: 0.1 }), 0], [pose({ d: 0.6 }), 500], [pose({ d: 1.2 }), 1000]])).toEqual([]);
    const curto = criarInterpretador('mao');
    expect(seq(curto, [[pose({ d: 0.2 }), 0], [pose({ d: 0.9 }), 300]])).toEqual([]);
  });
  it('baixar o braço para o lado do corpo (mão já fora do centro) não escolhe', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.6 }), 0], [pose({ d: 1.2 }), 300], [pose({ d: 0.75 }), 600]])).toEqual([]);
  });
});

describe('modo Mão v6.0.0: liberação entre escolhas (AC-9.22) e gestos antigos', () => {
  it('depois de um arraste, outro arraste só vale partindo de novo do centro', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 0.1 }), 0], [pose({ d: 1.2 }), 300]])).toEqual(['direita']);
    expect(seq(i, [[pose({ d: 1.3 }), 500], [pose({ d: 1.4 }), 900]])).toEqual([]);
    expect(seq(i, [[pose({ d: 0.1 }), 1000], [pose({ d: 1.2 }), 1300]])).toEqual(['direita']);
  });
  it('depois de "duas mãos para um lado", só escolhe de novo após desfazer a postura', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 0], [pose({ d: 1.0, e: 0.6 }), 300]])).toEqual(['direita']);
    expect(seq(i, [[pose({ d: 1.0, e: 0.6 }), 400], [pose({ d: 1.0, e: 0.6 }), 1500]])).toEqual([]);
    expect(seq(i, [[pose(), 1600], [pose({ d: 1.0, e: 0.6 }), 1700], [pose({ d: 1.0, e: 0.6 }), 2000]])).toEqual(['direita']);
  });
  it('AC-9.7 continua: mão direita levantada por ~300 ms = "direita"; duas levantadas = "maosParaCima"', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[pose({ dAlto: true }), 0], [pose({ dAlto: true }), 300]])).toEqual(['direita']);
    const j = criarInterpretador('mao');
    expect(seq(j, [[pose({ dAlto: true, eAlto: true }), 0], [pose({ dAlto: true, eAlto: true }), 500]])).toEqual(['maosParaCima']);
  });
});
