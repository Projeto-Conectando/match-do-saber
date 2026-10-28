import { describe, expect, it } from 'vitest';
import { criarRegistro, extrairPontos, type Amostra } from './diagnostico';
import type { Pose } from './gestos';

const amostra = (t: number, over: Partial<Amostra> = {}): Amostra => ({
  t, dtMs: 33, deteccaoMs: 20, pessoas: 1, tela: 'card', modo: 'mao', pontos: {}, medidas: {}, gestos: [], ...over,
});

describe('extrairPontos', () => {
  it('pega nariz, orelhas, ombros e punhos com x, y e confiança (3 casas)', () => {
    const pose: Pose = Array.from({ length: 33 }, (_, i) => ({ x: i / 100, y: 0.123456, visibility: 0.98765 }));
    const p = extrairPontos(pose);
    expect(Object.keys(p).sort()).toEqual(['nariz', 'ombroD', 'ombroE', 'orelhaD', 'orelhaE', 'punhoD', 'punhoE']);
    expect(p.punhoD).toEqual({ x: 0.16, y: 0.123, conf: 0.988 });
    expect(extrairPontos(null)).toEqual({});
  });
  it('confiança ausente vira 0', () => {
    const pose: Pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5 }));
    expect(extrairPontos(pose).nariz!.conf).toBe(0);
  });
});

describe('criarRegistro', () => {
  it('AC-12.4: guarda só a janela de 60 s', () => {
    const r = criarRegistro();
    for (let t = 0; t <= 70_000; t += 1000) r.adicionar(amostra(t));
    const exp = r.exportar();
    expect(exp.amostras[0]!.t).toBe(10_000);
    expect(exp.amostras.at(-1)!.t).toBe(70_000);
  });
  it('AC-12.3: resumo do último segundo (quadros, detecção média e máxima, gestos dos últimos 5 s)', () => {
    const r = criarRegistro();
    r.adicionar(amostra(500, { gestos: ['direita'] }));
    r.adicionar(amostra(5600, { deteccaoMs: 100 }));
    r.adicionar(amostra(5800, { deteccaoMs: 140 }));
    r.adicionar(amostra(6000, { deteccaoMs: null, gestos: ['maosParaCima'] }));
    const res = r.resumo(6000);
    expect(res.fps).toBe(3);
    expect(res.deteccaoMediaMs).toBe(120);
    expect(res.deteccaoMaxMs).toBe(140);
    expect(res.gestosRecentes).toEqual(['maosParaCima']);
    expect(r.ultima()!.t).toBe(6000);
  });
  it('sem amostras com detecção, as médias são null', () => {
    const r = criarRegistro();
    r.adicionar(amostra(100, { deteccaoMs: null }));
    expect(r.resumo(100)).toMatchObject({ fps: 1, deteccaoMediaMs: null, deteccaoMaxMs: null });
  });
  it('AC-12.4: exportar devolve versão, data e cópia das amostras', () => {
    const r = criarRegistro(60_000, () => '2026-10-28T12:00:00.000Z');
    r.adicionar(amostra(1));
    const exp = r.exportar();
    expect(exp).toMatchObject({ versao: 1, geradoEm: '2026-10-28T12:00:00.000Z' });
    exp.amostras.pop();
    expect(r.exportar().amostras).toHaveLength(1);
  });
  it('AC-12.4: exportar devolve o início da página em ms desde 1970, para o horário de cada amostra', () => {
    const r = criarRegistro(60_000, () => '2026-10-28T12:00:00.000Z', () => 1_793_188_800_000);
    r.adicionar(amostra(1500));
    const exp = r.exportar();
    expect(exp.inicioPaginaMs).toBe(1_793_188_800_000);
    expect(new Date(exp.inicioPaginaMs + exp.amostras[0]!.t).toISOString()).toBe('2026-10-28T12:00:01.500Z');
  });
});
