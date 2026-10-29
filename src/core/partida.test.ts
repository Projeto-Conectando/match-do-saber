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
const ctx = (over: Partial<Contexto> = {}): Contexto => ({
  noticias, rng: () => 0.5, cameraAtiva: true, tempoCardMs: TEMPOS.cardMs, ...over,
});

const centro: Presenca = { presente: true, centralizado: true };
const lado: Presenca = { presente: true, centralizado: false };
const ninguem: Presenca = { presente: false, centralizado: false };
const tick = (dtMs: number, presenca: Presenca | null = centro): Evento => ({ tipo: 'tick', dtMs, presenca });

function rodar(estado: Estado, eventos: Evento[], c = ctx()): Estado {
  return eventos.reduce((s, e) => reduzir(s, e, c), estado);
}
/** Partida pelo teclado: Enter na espera abre a calibração (câmera ativa, AC-1.7) e Enter na calibração a pula (AC-1.8). */
const emCard = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, { tipo: 'enter' }], c);
/** Partida pelo corpo: Enter abre a calibração e 2 s no centro iniciam a partida (AC-1.2, AC-1.7). */
const emCardCalibrado = (c = ctx()) => rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16), tick(1000), tick(1000)], c);
function cardAtual(s: Estado) {
  if (s.tela !== 'card') throw new Error(`esperava card, veio ${s.tela}`);
  return s.partida.cards[s.indice]!;
}

describe('espera e calibração (v3.0.0: início só manual)', () => {
  it('AC-1.1: a câmera nunca inicia nada: presença na espera não faz o jogo sair dela', () => {
    let s: Estado = ESTADO_INICIAL;
    for (const p of [lado, centro, ninguem, centro]) {
      for (let i = 0; i < 300; i++) s = reduzir(s, tick(100, p), ctx());
      expect(s).toBe(ESTADO_INICIAL);
    }
  });
  it('AC-1.6: sem câmera, Enter inicia na hora, sem calibração', () => {
    const c = ctx({ cameraAtiva: false });
    const s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, c);
    expect(s).toMatchObject({ tela: 'card', indice: 0 });
    if (s.tela !== 'card') throw new Error();
    expect(s.partida.entrada).toBe('alternativa');
  });
  it('AC-1.7: com câmera ativa, Enter abre a calibração e a partida ainda não começa', () => {
    expect(reduzir(ESTADO_INICIAL, { tipo: 'enter' }, ctx()).tela).toBe('calibracao');
  });
  it('AC-1.2: depois do Enter, 2 s contínuos no centro iniciam a partida com 15 s (entrada "corpo")', () => {
    const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(1000), tick(1000)]);
    expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: TEMPOS.cardMs });
    if (s.tela !== 'card') throw new Error();
    expect(s.partida.entrada).toBe('corpo');
  });
  it('AC-1.3: sair do centro reinicia a contagem', () => {
    const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(1500), tick(16, lado), tick(1500)]);
    expect(s).toMatchObject({ tela: 'calibracao', centradoMs: 1500 });
  });
  it('AC-1.4: 10 s sem ninguém na calibração voltam à espera, e ela permanece mesmo com alguém no quadro depois', () => {
    const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(5000, ninguem), tick(5000, ninguem)]);
    expect(s.tela).toBe('espera');
    expect(rodar(s, [tick(100), tick(5000), tick(5000)]).tela).toBe('espera');
  });
  it('AC-1.8: Enter na calibração a pula e inicia pela entrada alternativa', () => {
    const s = rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16, lado), { tipo: 'enter' }]);
    expect(s).toMatchObject({ tela: 'card', indice: 0 });
    if (s.tela !== 'card') throw new Error();
    expect(s.partida.entrada).toBe('alternativa');
  });
  it('AC-6.4: sem notícias, nem o Enter inicia', () => {
    const c = ctx({ noticias: [] });
    expect(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(16)], c).tela).toBe('espera');
  });
  it('AC-5.5/AC-10.3: depois de sair do quadro ou de Sair, com alguém no quadro, o jogo fica na espera', () => {
    const perdida = rodar(emCardCalibrado(), [tick(6000, ninguem), tick(4000, ninguem)]);
    expect(perdida.tela).toBe('espera');
    expect(rodar(perdida, [tick(100), tick(5000), tick(5000)]).tela).toBe('espera');
    const depoisDeSair = reduzir(emCard(), { tipo: 'sair' }, ctx());
    expect(rodar(depoisDeSair, [tick(100), tick(5000), tick(5000)]).tela).toBe('espera');
  });
});

describe('card', () => {
  it('AC-4.1: acerto soma ponto e mostra feedback de 3 s (após a saída do card)', () => {
    const s0 = emCard();
    const s = reduzir(s0, { tipo: 'escolha', resposta: cardAtual(s0).veredito }, ctx());
    expect(s).toMatchObject({ tela: 'feedback', restanteMs: TEMPOS.saidaMs + TEMPOS.feedbackMs });
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
    expect(s.resposta).toBeNull(); // sem lado: não há animação de saída
  });
  it.each(['verdadeira', 'falsa'] as const)('AC-2.1/AC-2.2: feedback guarda o lado escolhido (%s) para a animação de saída', (resposta) => {
    const s = reduzir(emCard(), { tipo: 'escolha', resposta }, ctx());
    expect(s).toMatchObject({ tela: 'feedback', resposta, restanteMs: TEMPOS.saidaMs + TEMPOS.feedbackMs });
  });
  it('AC-4.1/AC-4.2: após uma escolha, o feedback dura a saída do card (250 ms) + 3 s inteiros', () => {
    expect(TEMPOS.saidaMs).toBe(250);
    const s1 = reduzir(emCard(), { tipo: 'escolha', resposta: 'falsa' }, ctx());
    expect(rodar(s1, [tick(3249)])).toMatchObject({ tela: 'feedback', indice: 0 });
    expect(rodar(s1, [tick(3250)])).toMatchObject({ tela: 'card', indice: 1 });
  });
  it('AC-4.3: após tempo esgotado (sem saída do card), o feedback dura exatamente 3 s', () => {
    const s1 = rodar(emCard(), [tick(TEMPOS.cardMs)]);
    expect(s1).toMatchObject({ tela: 'feedback', resposta: null, restanteMs: TEMPOS.feedbackMs });
    expect(rodar(s1, [tick(2999)])).toMatchObject({ tela: 'feedback', indice: 0 });
    expect(rodar(s1, [tick(3000)])).toMatchObject({ tela: 'card', indice: 1 });
  });
  it('AC-4.4: depois do feedback vem o próximo card com 15 s; escolha no feedback é ignorada', () => {
    const s1 = reduzir(emCard(), { tipo: 'escolha', resposta: 'falsa' }, ctx());
    const s2 = reduzir(s1, { tipo: 'escolha', resposta: 'falsa' }, ctx());
    expect(s2).toBe(s1);
    expect(rodar(s1, [tick(TEMPOS.saidaMs + TEMPOS.feedbackMs)])).toMatchObject({ tela: 'card', indice: 1, restanteMs: TEMPOS.cardMs });
  });
  it('AC-3.1/AC-3.2 (v5.0.0): o cronômetro continua correndo com o saiba mais aberto', () => {
    const s = rodar(emCard(), [tick(1000), { tipo: 'saibaMais' }, tick(3000)]);
    expect(s).toMatchObject({ saibaMais: true, restanteMs: 11000 });
    expect(rodar(s, [{ tipo: 'saibaMais' }, tick(1000)])).toMatchObject({ saibaMais: false, restanteMs: 10000 });
  });
  it('AC-3.3: escolha com saiba mais aberto registra normalmente', () => {
    const s = rodar(emCard(), [{ tipo: 'saibaMais' }, { tipo: 'escolha', resposta: 'falsa' }]);
    expect(s.tela).toBe('feedback');
  });
  it('v5.0.0: o saiba mais não fecha sozinho; o tempo esgotando leva ao feedback "tempo" (AC-4.3)', () => {
    const s = rodar(emCard(), [{ tipo: 'saibaMais' }, tick(10000)]);
    expect(s).toMatchObject({ tela: 'card', saibaMais: true, restanteMs: 5000 });
    const fim = rodar(s, [tick(5000)]);
    if (fim.tela !== 'feedback') throw new Error(fim.tela);
    expect(fim.partida.resultados).toEqual(['tempo']);
  });
  it('AC-5.3 (v5.0.0): "Volte para o centro" ainda pausa o cronômetro, mesmo com o saiba mais aberto', () => {
    const s = rodar(emCardCalibrado(), [{ tipo: 'saibaMais' }, tick(1000), tick(4000, ninguem)]);
    expect(s).toMatchObject({ saibaMais: true, ausenteMs: 4000, restanteMs: 14000 });
  });
  it('AC-5.3/AC-5.4: sem pessoa pausa; voltando antes de 10 s continua do mesmo card', () => {
    const s = rodar(emCardCalibrado(), [tick(1000), tick(4000, ninguem)]);
    expect(s).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: 14000 });
    expect(rodar(s, [tick(1000)])).toMatchObject({ tela: 'card', indice: 0, ausenteMs: null, restanteMs: 13000 });
  });
  it('AC-5.5: 10 s sem pessoa encerra e volta à espera', () => {
    expect(rodar(emCardCalibrado(), [tick(6000, ninguem), tick(4000, ninguem)]).tela).toBe('espera');
  });
  it('AC-1.6: partida iniciada por Enter com câmera ativa ignora ausência', () => {
    const s0 = emCard(ctx({ cameraAtiva: true }));
    if (s0.tela !== 'card') throw new Error(s0.tela);
    expect(s0.partida.entrada).toBe('alternativa');
    const s = rodar(s0, [tick(4000, ninguem), tick(4000, ninguem), tick(4000, ninguem)]);
    expect(s).toMatchObject({ tela: 'card', indice: 0, restanteMs: 3000, ausenteMs: null });
    expect(rodar(s, [tick(3000, ninguem)]).tela).toBe('feedback');
  });
  it('partida calibrada usa entrada "corpo" e pausa na ausência', () => {
    const s0 = emCardCalibrado();
    if (s0.tela !== 'card') throw new Error(s0.tela);
    expect(s0.partida.entrada).toBe('corpo');
    expect(rodar(s0, [tick(4000, ninguem)])).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: TEMPOS.cardMs });
    expect(rodar(s0, [tick(6000, ninguem), tick(4000, ninguem)]).tela).toBe('espera');
  });
  it('câmera indisponível (presenca null) não pausa', () => {
    expect(rodar(emCard(), [tick(2000, null)])).toMatchObject({ restanteMs: 13000, ausenteMs: null });
  });
});

describe('resumo', () => {
  const jogarTudo = (c = ctx()) => {
    let s = emCard(c);
    for (let i = 0; i < 3; i++) s = rodar(s, [{ tipo: 'escolha', resposta: 'verdadeira' }, tick(TEMPOS.saidaMs + TEMPOS.feedbackMs)], c);
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
    expect(s.partida.entrada).toBe('alternativa');
  });
});

describe('v2.0.0: tempo por card e sair', () => {
  it('AC-9.17/AC-1.2/AC-4.4: o tempo configurado vale para todos os cards', () => {
    const c = ctx({ tempoCardMs: 20000 });
    const s0 = emCard(c);
    expect(s0).toMatchObject({ tela: 'card', restanteMs: 20000 });
    const s1 = rodar(s0, [{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs + TEMPOS.feedbackMs)], c);
    expect(s1).toMatchObject({ tela: 'card', indice: 1, restanteMs: 20000 });
    expect(rodar(s1, [tick(10000), tick(9999)], c).tela).toBe('card');
    expect(rodar(s1, [tick(10000), tick(10000)], c).tela).toBe('feedback');
  });
  it.each(['calibracao', 'card', 'saibaMais', 'feedback', 'resumo'] as const)('AC-10.3: sair em %s volta à espera', (onde) => {
    const c = ctx();
    let s: Estado;
    if (onde === 'calibracao') s = reduzir(ESTADO_INICIAL, { tipo: 'enter' }, c);
    else if (onde === 'card') s = emCard(c);
    else if (onde === 'saibaMais') s = reduzir(emCard(c), { tipo: 'saibaMais' }, c);
    else if (onde === 'feedback') s = reduzir(emCard(c), { tipo: 'escolha', resposta: 'falsa' }, c);
    else {
      s = emCard(c);
      for (let i = 0; i < 3; i++) s = rodar(s, [{ tipo: 'escolha', resposta: 'falsa' }, tick(TEMPOS.saidaMs + TEMPOS.feedbackMs)], c);
    }
    expect(s.tela).toBe(onde === 'saibaMais' ? 'card' : onde);
    expect(reduzir(s, { tipo: 'sair' }, c)).toEqual(ESTADO_INICIAL);
  });
  it('AC-10.4: sair na espera não muda nada', () => {
    expect(reduzir(ESTADO_INICIAL, { tipo: 'sair' }, ctx())).toBe(ESTADO_INICIAL);
  });
});

describe('v6.0.0: ausência só pausa no modo Corpo', () => {
  it('AC-9.21: com ignorarAusencia (Mão/Cabeça), partida calibrada não pausa nem encerra sem ninguém', () => {
    const c = ctx({ ignorarAusencia: true });
    const s0 = emCardCalibrado(c);
    expect(s0.tela).toBe('card');
    const s = rodar(s0, [tick(6000, ninguem), tick(6000, ninguem)], c);
    expect(s).toMatchObject({ tela: 'card', ausenteMs: null, restanteMs: TEMPOS.cardMs - 12000 });
  });
  it('AC-5.3 (modo Corpo): sem ignorarAusencia, a partida calibrada ainda pausa', () => {
    const s = rodar(emCardCalibrado(), [tick(4000, ninguem)]);
    expect(s).toMatchObject({ tela: 'card', ausenteMs: 4000, restanteMs: TEMPOS.cardMs });
  });
  it('a calibração continua exigindo a pessoa no centro, mesmo com ignorarAusencia', () => {
    const c = ctx({ ignorarAusencia: true });
    expect(rodar(ESTADO_INICIAL, [{ tipo: 'enter' }, tick(5000, ninguem), tick(5000, ninguem)], c).tela).toBe('espera');
  });
});
