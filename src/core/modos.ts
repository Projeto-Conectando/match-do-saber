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

export interface Armazenamento {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
}

const CHAVE = 'match-do-saber:modo';

export function lerModo(a: Armazenamento | null): ModoJogo {
  try {
    const v = a?.getItem(CHAVE);
    return MODOS.includes(v as ModoJogo) ? (v as ModoJogo) : MODO_PADRAO;
  } catch {
    return MODO_PADRAO;
  }
}

export function salvarModo(a: Armazenamento | null, modo: ModoJogo): void {
  try {
    a?.setItem(CHAVE, modo);
  } catch {
    // Armazenamento bloqueado: a escolha vale até o jogo ser fechado.
  }
}
