import { sortear } from './sorteio';
import type { Noticia, Tecnica, Veredito } from './types';

export const TEMPOS = {
  cardMs: 15000,
  feedbackMs: 3000,
  saidaMs: 250,
  calibracaoMs: 2000,
  ausenciaMs: 10000,
  saibaMaisOciosoMs: 5000,
} as const;

export type Resultado = 'acerto' | 'erro' | 'tempo';
export interface Presenca { presente: boolean; centralizado: boolean }
export type Entrada = 'corpo' | 'alternativa';
export interface Partida { cards: Noticia[]; resultados: Resultado[]; entrada: Entrada }

export type EstadoCard = {
  tela: 'card';
  partida: Partida;
  indice: number;
  restanteMs: number;
  saibaMais: boolean;
  saibaMaisOciosoMs: number;
  ausenteMs: number | null;
};

export type Estado =
  | { tela: 'espera' }
  | { tela: 'calibracao'; centradoMs: number; ausenteMs: number }
  | EstadoCard
  // `resposta` guarda o lado escolhido (para a animação de saída); null quando o tempo esgotou.
  | { tela: 'feedback'; partida: Partida; indice: number; restanteMs: number; resposta: Veredito | null }
  | { tela: 'resumo'; partida: Partida };

export type Evento =
  | { tipo: 'tick'; dtMs: number; presenca: Presenca | null }
  | { tipo: 'escolha'; resposta: Veredito }
  | { tipo: 'saibaMais' }
  | { tipo: 'enter' };

export interface Contexto { noticias: Noticia[]; rng: () => number; cameraAtiva: boolean }

export const ESTADO_INICIAL: Estado = { tela: 'espera' };
const CALIBRACAO: Estado = { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };

function card(partida: Partida, indice: number): EstadoCard {
  return { tela: 'card', partida, indice, restanteMs: TEMPOS.cardMs, saibaMais: false, saibaMaisOciosoMs: 0, ausenteMs: null };
}

function iniciarPartida(ctx: Contexto, entrada: Entrada): Estado {
  const cards = sortear(ctx.noticias, ctx.rng);
  return cards.length === 0 ? ESTADO_INICIAL : card({ cards, resultados: [], entrada }, 0);
}

function registrar(e: EstadoCard, r: Resultado, resposta: Veredito | null): Estado {
  return {
    tela: 'feedback',
    partida: { ...e.partida, resultados: [...e.partida.resultados, r] },
    indice: e.indice,
    // Escolha: o card sai antes (saidaMs) e o resultado ainda fica 3 s inteiros (AC-4.1/AC-4.2).
    restanteMs: resposta === null ? TEMPOS.feedbackMs : TEMPOS.feedbackMs + TEMPOS.saidaMs,
    resposta,
  };
}

export function reduzir(estado: Estado, evento: Evento, ctx: Contexto): Estado {
  switch (estado.tela) {
    case 'espera': {
      if (ctx.noticias.length === 0) return estado;
      if (evento.tipo === 'enter') return iniciarPartida(ctx, 'alternativa');
      if (evento.tipo === 'tick' && evento.presenca?.presente) return CALIBRACAO;
      return estado;
    }
    case 'calibracao': {
      if (evento.tipo === 'enter') return iniciarPartida(ctx, 'alternativa');
      if (evento.tipo !== 'tick') return estado;
      const p = evento.presenca;
      if (!p || !p.presente) {
        const ausenteMs = estado.ausenteMs + evento.dtMs;
        return ausenteMs >= TEMPOS.ausenciaMs ? ESTADO_INICIAL : { tela: 'calibracao', centradoMs: 0, ausenteMs };
      }
      if (!p.centralizado) return { tela: 'calibracao', centradoMs: 0, ausenteMs: 0 };
      const centradoMs = estado.centradoMs + evento.dtMs;
      return centradoMs >= TEMPOS.calibracaoMs ? iniciarPartida(ctx, 'corpo') : { tela: 'calibracao', centradoMs, ausenteMs: 0 };
    }
    case 'card': {
      if (evento.tipo === 'escolha') {
        const certo = evento.resposta === estado.partida.cards[estado.indice]!.veredito;
        return registrar(estado, certo ? 'acerto' : 'erro', evento.resposta);
      }
      if (evento.tipo === 'saibaMais') return { ...estado, saibaMais: !estado.saibaMais, saibaMaisOciosoMs: 0 };
      if (evento.tipo !== 'tick') return estado;
      // Partida pelo teclado/mouse (AC-1.6) não depende de presença.
      const p = estado.partida.entrada === 'alternativa' ? null : evento.presenca;
      if (p && !p.presente) {
        const ausenteMs = (estado.ausenteMs ?? 0) + evento.dtMs;
        return ausenteMs >= TEMPOS.ausenciaMs ? ESTADO_INICIAL : { ...estado, ausenteMs };
      }
      const base: EstadoCard = { ...estado, ausenteMs: null };
      if (base.saibaMais) {
        const ocioso = base.saibaMaisOciosoMs + evento.dtMs;
        return ocioso >= TEMPOS.saibaMaisOciosoMs
          ? { ...base, saibaMais: false, saibaMaisOciosoMs: 0 }
          : { ...base, saibaMaisOciosoMs: ocioso };
      }
      const restanteMs = base.restanteMs - evento.dtMs;
      return restanteMs <= 0 ? registrar(base, 'tempo', null) : { ...base, restanteMs };
    }
    case 'feedback': {
      if (evento.tipo !== 'tick') return estado;
      const restanteMs = estado.restanteMs - evento.dtMs;
      if (restanteMs > 0) return { ...estado, restanteMs };
      const proximo = estado.indice + 1;
      return proximo < estado.partida.cards.length
        ? card(estado.partida, proximo)
        : { tela: 'resumo', partida: estado.partida };
    }
    case 'resumo': {
      if (evento.tipo !== 'enter') return estado;
      return ctx.cameraAtiva ? CALIBRACAO : iniciarPartida(ctx, 'alternativa');
    }
  }
}

export function pontos(p: Partida): number {
  return p.resultados.filter((r) => r === 'acerto').length;
}

export function tecnicasDaPartida(p: Partida): Tecnica[] {
  return [...new Set(p.cards.slice(0, p.resultados.length).map((c) => c.tecnica))];
}
