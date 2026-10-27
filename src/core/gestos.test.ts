import { describe, expect, it } from 'vitest';
import { criarInterpretador, escolherJogador, type Pose } from './gestos';

/** Pose sintética: cxJogador é o centro do tronco do ponto de vista do jogador (0..1, espelhado). */
function pose(cxJogador: number, opts: { largura?: number; maosAcima?: boolean } = {}): Pose {
  const largura = opts.largura ?? 0.2;
  const cx = 1 - cxJogador; // coordenada crua da câmera
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.6, visibility: 1 }));
  p[0] = { x: cx, y: 0.3, visibility: 1 };
  p[11] = { x: cx + largura / 2, y: 0.45, visibility: 1 };
  p[12] = { x: cx - largura / 2, y: 0.45, visibility: 1 };
  const yMao = opts.maosAcima ? 0.15 : 0.7;
  p[15] = { x: cx + largura, y: yMao, visibility: 1 };
  p[16] = { x: cx - largura, y: yMao, visibility: 1 };
  return p;
}

function sequencia(interp: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) {
  return passos.flatMap(([p, t]) => interp.ler(p, t).gestos);
}

describe('escolherJogador', () => {
  it('AC-1.5: escolhe a pessoa mais central e maior', () => {
    const canto = pose(0.1, { largura: 0.3 });
    const centralPequena = pose(0.5, { largura: 0.1 });
    const centralGrande = pose(0.55, { largura: 0.25 });
    expect(escolherJogador([canto, centralPequena, centralGrande])).toBe(centralGrande);
    expect(escolherJogador([])).toBeNull();
  });
});

describe('interpretador', () => {
  it('presença e centralização', () => {
    const i = criarInterpretador();
    expect(i.ler(null, 0).presenca).toEqual({ presente: false, centralizado: false });
    expect(i.ler(pose(0.5), 10).presenca).toEqual({ presente: true, centralizado: true });
    expect(i.ler(pose(0.8), 20).presenca).toEqual({ presente: true, centralizado: false });
  });

  it('AC-2.1: direita do jogador por 300 ms = "direita"', () => {
    const i = criarInterpretador();
    i.ler(pose(0.5), 0);
    i.calibrar();
    expect(sequencia(i, [[pose(0.7), 100], [pose(0.7), 300]])).toEqual([]);
    expect(sequencia(i, [[pose(0.7), 400]])).toEqual(['direita']);
  });

  it('AC-2.2: esquerda do jogador por 300 ms = "esquerda"', () => {
    const i = criarInterpretador();
    i.ler(pose(0.5), 0);
    i.calibrar();
    expect(sequencia(i, [[pose(0.3), 100], [pose(0.3), 450]])).toEqual(['esquerda']);
  });

  it('mede relativo à calibração', () => {
    const i = criarInterpretador();
    i.ler(pose(0.6), 0);
    i.calibrar();
    expect(sequencia(i, [[pose(0.7), 100], [pose(0.7), 500]])).toEqual([]);
  });

  it('AC-2.3: inclinação proporcional sem gesto abaixo do limiar', () => {
    const i = criarInterpretador();
    i.ler(pose(0.5), 0);
    i.calibrar();
    const l = i.ler(pose(0.56), 100);
    expect(l.inclinacao).toBeCloseTo(0.5, 1);
    expect(sequencia(i, [[pose(0.56), 1000]])).toEqual([]);
  });

  it('AC-2.4: exige voltar ao centro entre escolhas', () => {
    const i = criarInterpretador();
    i.ler(pose(0.5), 0);
    i.calibrar();
    expect(sequencia(i, [[pose(0.7), 100], [pose(0.7), 400]])).toEqual(['direita']);
    expect(sequencia(i, [[pose(0.7), 800], [pose(0.7), 1500]])).toEqual([]);
    expect(sequencia(i, [[pose(0.5), 1600], [pose(0.7), 1700], [pose(0.7), 2000]])).toEqual(['direita']);
  });

  it('AC-3.1: duas mãos acima do nariz por 500 ms = "maosParaCima", uma vez por levantada', () => {
    const i = criarInterpretador();
    const g = sequencia(i, [
      [pose(0.5, { maosAcima: true }), 0],
      [pose(0.5, { maosAcima: true }), 400],
      [pose(0.5, { maosAcima: true }), 500],
      [pose(0.5, { maosAcima: true }), 2000],
    ]);
    expect(g).toEqual(['maosParaCima']);
    expect(sequencia(i, [[pose(0.5), 2100], [pose(0.5, { maosAcima: true }), 2200], [pose(0.5, { maosAcima: true }), 2700]]))
      .toEqual(['maosParaCima']);
  });

  it('perder a pessoa zera a contagem', () => {
    const i = criarInterpretador();
    i.ler(pose(0.5), 0);
    i.calibrar();
    expect(sequencia(i, [[pose(0.7), 100], [null, 200], [pose(0.7), 300], [pose(0.7), 500]])).toEqual([]);
  });
});
