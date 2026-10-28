import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, reduzir, type Contexto, type Estado } from './partida';
import type { Noticia } from './types';
import { DT_MAX_MS, dtDoQuadro } from './relogio';

const noticias: Noticia[] = [
  { id: 'v1', veredito: 'verdadeira', tecnica: 'data', titulo: 'v1', descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '' },
  { id: 'f1', veredito: 'falsa', tecnica: 'fonte', titulo: 'f1', descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '' },
];
const ctx: Contexto = { noticias, rng: () => 0.5, cameraAtiva: false, tempoCardMs: TEMPOS.cardMs };

describe('relógio do jogo: dt do quadro segue o tempo real (FR-1, AC-4.4)', () => {
  it('quadro normal de 16 ms vale 16 ms', () => {
    expect(dtDoQuadro(1016, 1000)).toBe(16);
  });
  it('quadro lento da detecção (154 ms) vale 154 ms, não 100 ms', () => {
    expect(dtDoQuadro(1154, 1000)).toBe(154);
  });
  it('lacuna longa (aba oculta, 60 s) é limitada ao teto', () => {
    expect(dtDoQuadro(61_000, 1000)).toBe(DT_MAX_MS);
    expect(DT_MAX_MS).toBe(1000);
  });
  it('diferença negativa vale 0', () => {
    expect(dtDoQuadro(1000, 1016)).toBe(0);
  });

  it('10 s de relógio real a 154 ms por quadro consomem ~10 s do card (restam ~5 s de 15 s)', () => {
    let s: Estado = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx);
    expect(s).toMatchObject({ tela: 'card', restanteMs: TEMPOS.cardMs });
    let anterior = 0;
    for (let agora = 154; agora <= 10_000; agora += 154) {
      s = reduzir(s, { tipo: 'tick', dtMs: dtDoQuadro(agora, anterior), presenca: null }, ctx);
      anterior = agora;
    }
    if (s.tela !== 'card') throw new Error(`esperava card, veio ${s.tela}`);
    expect(Math.abs(s.restanteMs - 5000)).toBeLessThanOrEqual(155);
  });
});
