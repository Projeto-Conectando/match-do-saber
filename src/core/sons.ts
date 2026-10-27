import { TEMPOS, type Estado } from './partida';

export type Som = 'deslizar' | 'acerto' | 'erro';

/** Sons a tocar na passagem de `antes` para `depois` (FR-11). */
export function sonsDaTransicao(antes: Estado, depois: Estado): Som[] {
  if (depois.tela !== 'feedback') return [];
  const resultado: Som = depois.partida.resultados[depois.indice] === 'acerto' ? 'acerto' : 'erro';
  if (antes.tela === 'card') return depois.resposta === null ? [resultado] : ['deslizar'];
  // Depois da saída do card (TEMPOS.saidaMs), o resultado aparece: toca uma vez.
  const terminouSaida =
    antes.tela === 'feedback' &&
    antes.indice === depois.indice &&
    depois.resposta !== null &&
    antes.restanteMs > TEMPOS.feedbackMs &&
    depois.restanteMs <= TEMPOS.feedbackMs;
  return terminouSaida ? [resultado] : [];
}
