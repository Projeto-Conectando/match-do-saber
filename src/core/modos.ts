export type ModoJogo = 'corpo' | 'mao' | 'cabeca';

export const MODOS: readonly ModoJogo[] = ['corpo', 'mao', 'cabeca'];
export const MODO_PADRAO: ModoJogo = 'corpo';

export const MODO_ROTULO: Record<ModoJogo, string> = { corpo: 'Corpo', mao: 'Mão', cabeca: 'Cabeça' };

export const DICA_GESTOS: Record<ModoJogo, string> = {
  corpo: 'Direita: é verdade · Esquerda: é falsa · Duas mãos para cima: saiba mais',
  mao: 'Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais',
  cabeca: 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais',
};

export const DICA_SAIBA_MAIS: Record<ModoJogo, string> = {
  corpo: '🙌 Saiba mais: levante as duas mãos (ou ↑)',
  mao: '🙌 Saiba mais: levante as duas mãos (ou ↑)',
  cabeca: 'Saiba mais: levante o queixo (ou ↑)',
};

export const TEMPOS_CARD_S: readonly number[] = [10, 15, 20, 25, 30];

export interface Configuracoes { modo: ModoJogo; tempoCardS: number; som: boolean }
export const CONFIG_PADRAO: Configuracoes = { modo: MODO_PADRAO, tempoCardS: 15, som: true };

export type ItemConfig = keyof Configuracoes;
export const ITENS_CONFIG: readonly ItemConfig[] = ['modo', 'tempoCardS', 'som'];
export const ROTULO_ITEM: Record<ItemConfig, string> = { modo: 'Modo de jogo', tempoCardS: 'Tempo por card', som: 'Som' };
export const OPCOES: { [K in ItemConfig]: readonly Configuracoes[K][] } = {
  modo: MODOS,
  tempoCardS: TEMPOS_CARD_S,
  som: [true, false],
};

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

const CHAVES: Record<ItemConfig, string> = {
  modo: 'match-do-saber:modo',
  tempoCardS: 'match-do-saber:tempoCard',
  som: 'match-do-saber:som',
};

function ler(a: Armazenamento | null, chave: string): string | null {
  try {
    return a?.getItem(chave) ?? null;
  } catch {
    return null;
  }
}

export function lerConfiguracoes(a: Armazenamento | null): Configuracoes {
  const modo = ler(a, CHAVES.modo);
  const tempo = Number(ler(a, CHAVES.tempoCardS));
  const som = ler(a, CHAVES.som);
  return {
    modo: MODOS.includes(modo as ModoJogo) ? (modo as ModoJogo) : CONFIG_PADRAO.modo,
    tempoCardS: TEMPOS_CARD_S.includes(tempo) ? tempo : CONFIG_PADRAO.tempoCardS,
    som: som === 'ligado' ? true : som === 'desligado' ? false : CONFIG_PADRAO.som,
  };
}

export function salvarConfiguracoes(a: Armazenamento | null, c: Configuracoes): void {
  try {
    a?.setItem(CHAVES.modo, c.modo);
    a?.setItem(CHAVES.tempoCardS, String(c.tempoCardS));
    a?.setItem(CHAVES.som, c.som ? 'ligado' : 'desligado');
  } catch {
    // Armazenamento bloqueado: as escolhas valem até o jogo ser fechado.
  }
}

export function mudarValor(c: Configuracoes, item: ItemConfig, passo: -1 | 1): Configuracoes {
  const lista = OPCOES[item] as readonly unknown[];
  const i = lista.indexOf(c[item]);
  const j = Math.max(0, Math.min(lista.length - 1, i + passo));
  return { ...c, [item]: lista[j] } as Configuracoes;
}

export function rotuloValor(item: ItemConfig, valor: Configuracoes[ItemConfig]): string {
  if (item === 'modo') return MODO_ROTULO[valor as ModoJogo];
  if (item === 'tempoCardS') return `${valor} s`;
  return valor ? 'Ligado' : 'Desligado';
}

export function resumoConfiguracoes(c: Configuracoes): string {
  return `Modo: ${MODO_ROTULO[c.modo]} · Tempo por card: ${c.tempoCardS} s · Som: ${c.som ? 'ligado' : 'desligado'}`;
}

/** @deprecated v2.0.0: mantido só até a Fase 10.4 remover `useModoJogo`. */
export function lerModo(a: Armazenamento | null): ModoJogo {
  return lerConfiguracoes(a).modo;
}

/** @deprecated v2.0.0: mantido só até a Fase 10.4 remover `useModoJogo`. */
export function salvarModo(a: Armazenamento | null, modo: ModoJogo): void {
  try {
    a?.setItem(CHAVES.modo, modo);
  } catch {
    // Armazenamento bloqueado.
  }
}
