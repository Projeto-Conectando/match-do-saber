import { describe, expect, it } from 'vitest';
import { criarInterpretador, type Pose } from './gestos';

/** Pose sintética em coordenadas cruas da câmera; cxJogador é o centro do ponto de vista do jogador. */
function base(cxJogador = 0.5): Pose {
  const cx = 1 - cxJogador;
  const p = Array.from({ length: 33 }, () => ({ x: cx, y: 0.8, visibility: 1 }));
  p[0] = { x: cx, y: 0.33, visibility: 1 };          // nariz
  p[7] = { x: cx + 0.05, y: 0.3, visibility: 1 };    // orelha esquerda
  p[8] = { x: cx - 0.05, y: 0.3, visibility: 1 };    // orelha direita
  p[11] = { x: cx + 0.1, y: 0.45, visibility: 1 };   // ombro esquerdo
  p[12] = { x: cx - 0.1, y: 0.45, visibility: 1 };   // ombro direito
  p[15] = { x: cx + 0.15, y: 0.7, visibility: 1 };   // punho esquerdo
  p[16] = { x: cx - 0.15, y: 0.7, visibility: 1 };   // punho direito
  return p;
}
function maos(o: { direita?: boolean; esquerda?: boolean }, cx = 0.5): Pose {
  const p = base(cx);
  if (o.direita) p[16] = { ...p[16]!, y: 0.3 };
  if (o.esquerda) p[15] = { ...p[15]!, y: 0.3 };
  return p;
}
/** rollGraus > 0 = cabeça inclinada para a própria direita; queixo > 0 = olhando para cima. */
function cabeca(rollGraus: number, queixo = 0, cx = 0.5): Pose {
  const p = base(cx);
  const dy = Math.tan((rollGraus * Math.PI) / 180) * 0.1;
  p[7] = { ...p[7]!, y: 0.3 - dy / 2 };
  p[8] = { ...p[8]!, y: 0.3 + dy / 2 };
  p[0] = { ...p[0]!, y: 0.33 - queixo * 0.1 };
  return p;
}
function seq(i: ReturnType<typeof criarInterpretador>, passos: [Pose | null, number][]) {
  return passos.flatMap(([p, t]) => i.ler(p, t).gestos);
}

describe('modo Mão', () => {
  it('presença pela parte de cima do corpo; card não inclina', () => {
    const i = criarInterpretador('mao');
    expect(i.ler(maos({}), 0)).toMatchObject({ presenca: { presente: true, centralizado: true }, inclinacao: 0 });
    expect(i.ler(maos({}, 0.8), 10).presenca.centralizado).toBe(false);
  });
  it('AC-9.7: mão direita acima do ombro por 300 ms = "direita"; esquerda = "esquerda"', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[maos({ direita: true }), 0], [maos({ direita: true }), 200]])).toEqual([]);
    expect(seq(i, [[maos({ direita: true }), 300]])).toEqual(['direita']);
    const j = criarInterpretador('mao');
    expect(seq(j, [[maos({ esquerda: true }), 0], [maos({ esquerda: true }), 300]])).toEqual(['esquerda']);
  });
  it('AC-9.8: duas mãos por 500 ms = "maosParaCima", sem escolha; baixar uma mão por vez não escolhe', () => {
    const i = criarInterpretador('mao');
    const ambas = maos({ direita: true, esquerda: true });
    expect(seq(i, [[ambas, 0], [ambas, 400]])).toEqual([]);
    expect(seq(i, [[ambas, 500], [ambas, 1500]])).toEqual(['maosParaCima']);
    expect(seq(i, [[maos({ esquerda: true }), 1600], [maos({ esquerda: true }), 2000]])).toEqual([]);
    expect(seq(i, [[maos({}), 2100], [maos({ esquerda: true }), 2200], [maos({ esquerda: true }), 2500]])).toEqual(['esquerda']);
  });
  it('AC-9.9: exige baixar as mãos entre escolhas', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[maos({ direita: true }), 0], [maos({ direita: true }), 300]])).toEqual(['direita']);
    expect(seq(i, [[maos({ direita: true }), 700], [maos({ direita: true }), 1500]])).toEqual([]);
    expect(seq(i, [[maos({}), 1600], [maos({ direita: true }), 1700], [maos({ direita: true }), 2000]])).toEqual(['direita']);
  });
  it('perder a pessoa zera a contagem', () => {
    const i = criarInterpretador('mao');
    expect(seq(i, [[maos({ direita: true }), 0], [null, 100], [maos({ direita: true }), 200], [maos({ direita: true }), 400]])).toEqual([]);
  });
});

describe('modo Cabeça', () => {
  it('AC-9.10: inclinar para a própria direita ~15° por 300 ms = "direita"; esquerda = "esquerda"', () => {
    const i = criarInterpretador('cabeca');
    i.ler(cabeca(0), 0);
    i.calibrar();
    expect(seq(i, [[cabeca(20), 100], [cabeca(20), 300]])).toEqual([]);
    expect(seq(i, [[cabeca(20), 400]])).toEqual(['direita']);
    const j = criarInterpretador('cabeca');
    j.ler(cabeca(0), 0);
    j.calibrar();
    expect(seq(j, [[cabeca(-20), 100], [cabeca(-20), 400]])).toEqual(['esquerda']);
  });
  it('mede em relação à calibração', () => {
    const i = criarInterpretador('cabeca');
    i.ler(cabeca(10), 0);
    i.calibrar();
    expect(seq(i, [[cabeca(20), 100], [cabeca(20), 1000]])).toEqual([]);
  });
  it('AC-9.13: inclinação proporcional abaixo do limiar, sem escolha', () => {
    const i = criarInterpretador('cabeca');
    i.ler(cabeca(0), 0);
    i.calibrar();
    expect(i.ler(cabeca(7.5), 100).inclinacao).toBeCloseTo(0.5, 1);
    expect(seq(i, [[cabeca(7.5), 1000]])).toEqual([]);
  });
  it('AC-9.12: exige voltar a cabeça ao centro entre escolhas', () => {
    const i = criarInterpretador('cabeca');
    i.ler(cabeca(0), 0);
    i.calibrar();
    expect(seq(i, [[cabeca(20), 100], [cabeca(20), 400]])).toEqual(['direita']);
    expect(seq(i, [[cabeca(20), 800], [cabeca(20), 1500]])).toEqual([]);
    expect(seq(i, [[cabeca(3), 1600], [cabeca(20), 1700], [cabeca(20), 2000]])).toEqual(['direita']);
  });
  it('AC-9.11: queixo para cima por 500 ms = "maosParaCima", uma vez por levantada, sem escolha', () => {
    const i = criarInterpretador('cabeca');
    i.ler(cabeca(0), 0);
    i.calibrar();
    expect(seq(i, [[cabeca(0, 0.3), 100], [cabeca(0, 0.3), 500]])).toEqual([]);
    expect(seq(i, [[cabeca(0, 0.3), 600], [cabeca(0, 0.3), 2000]])).toEqual(['maosParaCima']);
    expect(seq(i, [[cabeca(0), 2100], [cabeca(0, 0.3), 2200], [cabeca(0, 0.3), 2700]])).toEqual(['maosParaCima']);
  });
  it('sem calibração, usa a primeira leitura do queixo como referência', () => {
    const i = criarInterpretador('cabeca');
    expect(seq(i, [[cabeca(0), 0], [cabeca(0), 1000]])).toEqual([]);
  });
});
