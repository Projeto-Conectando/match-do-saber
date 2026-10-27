import { describe, expect, it } from 'vitest';
import { ESTADO_INICIAL, TEMPOS, reduzir, type Contexto, type Estado, type Evento } from './partida';
import { sonsDaTransicao, type Som } from './sons';
import type { Noticia } from './types';

const noticia: Noticia = {
  id: 'v1', veredito: 'verdadeira', tecnica: 'fonte', titulo: '', descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '',
};
const ctx: Contexto = { noticias: [noticia], rng: () => 0.5, cameraAtiva: false, tempoCardMs: TEMPOS.cardMs };
const tick = (dtMs: number): Evento => ({ tipo: 'tick', dtMs, presenca: null });

/** Aplica os eventos um a um e junta os sons de cada transição. */
function sons(eventos: Evento[], inicio: Estado = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx)): Som[] {
  let s = inicio;
  const out: Som[] = [];
  for (const e of eventos) {
    const n = reduzir(s, e, ctx);
    out.push(...sonsDaTransicao(s, n));
    s = n;
  }
  return out;
}

describe('sonsDaTransicao', () => {
  it('AC-11.1/AC-11.2: escolha certa = deslizar e, depois da saída do card, acerto', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100)])).toEqual(['deslizar']);
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(100), tick(100), tick(100)])).toEqual(['deslizar', 'acerto']);
  });
  it('AC-11.3: escolha errada = deslizar e erro', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs)])).toEqual(['deslizar', 'erro']);
  });
  it('AC-11.3: tempo esgotado = erro, sem deslizar', () => {
    expect(sons([tick(10000), tick(5000)])).toEqual(['erro']);
  });
  it('nada toca no resto do feedback nem fora dele', () => {
    expect(sons([{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs), tick(1000), tick(1000)])).toEqual(['deslizar', 'acerto']);
    expect(sons([tick(1000), { tipo: 'saibaMais' }, tick(1000)])).toEqual([]);
    const s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx);
    expect(sonsDaTransicao(s, s)).toEqual([]);
  });
});
