import { describe, expect, it } from 'vitest';
import {
  ESTADO_INICIAL, TEMPOS, pontos, reduzir, tecnicasDaPartida,
  type Contexto, type Estado, type Evento, type Presenca,
} from './partida';
import type { Noticia, Tecnica, Veredito } from './types';

const n = (id: string, veredito: Veredito, tecnica: Tecnica = 'fonte'): Noticia => ({
  id, veredito, tecnica, titulo: id, descricao: '', saibaMais: '', imagem: '', explicacao: '', fonteUrl: '',
});
const noticias = [n('v1', 'verdadeira', 'data'), n('f1', 'falsa', 'fonte'), n('v2', 'verdadeira', 'data')];
const ctx = (over: Partial<Contexto> = {}): Contexto => ({ noticias, rng: () => 0.5, cameraAtiva: true, ...over });

const centro: Presenca = { presente: true, centralizado: true };
const lado: Presenca = { presente: true, centralizado: false };
const ninguem: Presenca = { presente: false, centralizado: false };
const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });

function rodar(estado: Estado, eventos: Evento[], c = ctx()): Estado {
  return eventos.reduce((s, e) => reduzir(s, e, c), estado);
}
const emCard = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }], c);
function cardAtual(s: Estado) {
  if (s.tela !== 'card') throw new Error(`esperava card, veio ${s.tela}`);
  return s.partida.cards[s.indice]!;
}

describe('espera e calibração', () => {
  it('AC-1.1: pessoa no quadro leva à calibração', () => {
    expect(reduzir(ESTADO_INICIAL, tick(16, lado), ctx()).tela).toBe('calibracao');
  });
  it('AC-1.2: 2 s contínuos no centro iniciam a partida com 15 s', () => {
    const s = rodar(ESTADO_INICIAL, [tick(16), tick(1000), tick(1000)]);
    expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: TEMPOS.cardMs });
  });
  it('AC-1.3: sair do centro reinicia a contagem', () => {
    const s = rodar(ESTADO_INICIAL, [tick(16), tick(1500), tick(16, lado), tick(1500)]);
    expect(s).toMatchObject({ tela: 'calibracao', centradoMs: 1500 });
  });
  it('AC-1.4: 10 s sem ninguém na calibração volta à espera', () => {
    const s = rodar(ESTADO_INICIAL, [tick(16), tick(5000, ninguem), tick(5000, ninguem)]);
    expect(s.tela).toBe('espera');
  });
  it('AC-1.6: Enter na espera inicia sem calibração', () => {
    expect(emCard().tela).toBe('card');
  });
  it('AC-6.4: sem notícias, não inicia', () => {
    const c = ctx({ noticias: [] });
    expect(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16)], c).tela).toBe('espera');
  });
});

describe('card', () => {
  it('AC-4.1: acerto soma ponto e mostra feedback de 3 s', () => {
    const s0 = emCard();
    const s = reduzir(s0, { tipo: 'escolha', resposta: cardAtual(s0).veredito }, ctx());
    expect(s).toMatchObject({ tela: 'feedback', restanteMs: TEMPOS.feedbackMs });
    if (s.tela !== 'feedback') throw new Error();
    expect(s.partida.resultados).toEqual(['acerto']);
    expect(pontos(s.partida)).toBe(1);
  });
  it('AC-4.2: erro não soma ponto', () => {
    const s0 = emCard();
    const errada = cardAtual(s0).veredito === 'verdadeira' ? 'falsa' : 'verdadeira';
    const s = reduzir(s0, { tipo: 'escolha', resposta: errada }, ctx());
    if (s.tela !== 'feedback') throw new Error();
    expect(s.partida.resultados).toEqual(['erro']);
    expect(pontos(s.partida)).toBe(0);
  });
  it('AC-4.3: tempo esgotado registra "tempo"', () => {
    const s = rodar(emCard(), [tick(10000), tick(5000)]);
    if (s.tela !== 'feedback') throw new Error(s.tela);
    expect(s.partida.resultados).toEqual(['tempo']);
  });
  it('AC-4.4: depois do feedback vem o próximo card com 15 s; escolha no feedback é ignorada', () => {
    const s1 = reduzir(emCard(), { tipo: 'escolha', resposta: 'falsa' }, ctx());
    const s2 = reduzir(s1, { tipo: 'escolha', resposta: 'falsa' }, ctx());
    expect(s2).toBe(s1);
    expect(rodar(s1, [tick(3000)])).toMatchObject({ tela: 'card', indice: 1, restanteMs: TEMPOS.cardMs });
  });
  it('AC-3.1/AC-3.2: saiba mais pausa e retoma o cronômetro', () => {
    const s = rodar(emCard(), [tick(1000), { tipo: 'saibaMais' }, tick(3000)]);
    expect(s).toMatchObject({ saibaMais: true, restanteMs: 14000 });
    expect(rodar(s, [{ tipo: 'saibaMais' }, tick(1000)])).toMatchObject({ saibaMais: false, restanteMs: 13000 });
  });
  it('AC-3.3: escolha com saiba mais aberto registra normalmente', () => {
    const s = rodar(emCard(), [{ tipo: 'saibaMais' }, { tipo: 'escolha', resposta: 'falsa' }]);
    expect(s.tela).toBe('feedback');
  });
  it('AC-3.5: saiba mais fecha sozinho após 5 s', () => {
    const s = rodar(emCard(), [{ tipo: 'saibaMais' }, tick(4900)]);
    expect(s).toMatchObject({ saibaMais: true });
    expect(rodar(s, [tick(100)])).toMatchObject({ saibaMais: false, restanteMs: TEMPOS.cardMs });
  });
  it('AC-5.3/AC-5.4: sem pessoa pausa; voltando antes de 10 s continua do mesmo card', () => {
    const s = rodar(emCard(), [tick(1000), tick(4000, ninguem)]);
    expect(s).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: 14000 });
    expect(rodar(s, [tick(1000)])).toMatchObject({ tela: 'card', indice: 0, ausenteMs: null, restanteMs: 13000 });
  });
  it('AC-5.5: 10 s sem pessoa encerra e volta à espera', () => {
    expect(rodar(emCard(), [tick(6000, ninguem), tick(4000, ninguem)]).tela).toBe('espera');
  });
  it('câmera indisponível (presenca null) não pausa', () => {
    expect(rodar(emCard(), [tick(2000, null)])).toMatchObject({ restanteMs: 13000, ausenteMs: null });
  });
});

describe('resumo', () => {
  const jogarTudo = (c = ctx()) => {
    let s = emCard(c);
    for (let i = 0; i < 3; i++) s = rodar(s, [{ tipo: 'escolha', resposta: 'verdadeira' }, tick(3000)], c);
    return s;
  };
  it('AC-5.1: resumo com pontos e técnicas sem repetição', () => {
    const s = jogarTudo();
    if (s.tela !== 'resumo') throw new Error(s.tela);
    expect(pontos(s.partida)).toBe(2);
    expect(tecnicasDaPartida(s.partida).sort()).toEqual(['data', 'fonte']);
  });
  it('AC-5.2: resumo não expira', () => {
    expect(rodar(jogarTudo(), [tick(600000, ninguem)]).tela).toBe('resumo');
  });
  it('AC-5.6: Enter no resumo vai para a calibração (câmera ativa) ou inicia direto (sem câmera)', () => {
    expect(reduzir(jogarTudo(), { tipo: 'enter' }, ctx()).tela).toBe('calibracao');
    const semCamera = ctx({ cameraAtiva: false });
    const s = reduzir(jogarTudo(semCamera), { tipo: 'enter' }, semCamera);
    expect(s).toMatchObject({ tela: 'card', indice: 0 });
    if (s.tela !== 'card') throw new Error();
    expect(s.partida.resultados).toEqual([]);
  });
});
