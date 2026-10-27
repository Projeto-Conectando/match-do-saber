import { describe, expect, it } from 'vitest';
import { DICA_GESTOS, MODO_PADRAO, MODOS, lerModo, salvarModo, type Armazenamento } from './modos';

function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}
const quebrado: Armazenamento = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
};

describe('modos de jogo', () => {
  it('lista Corpo, Mão e Cabeça, com Corpo como padrão', () => {
    expect(MODOS).toEqual(['corpo', 'mao', 'cabeca']);
    expect(MODO_PADRAO).toBe('corpo');
  });
  it('AC-9.4: sem valor guardado, usa Corpo', () => {
    expect(lerModo(memoria())).toBe('corpo');
    expect(lerModo(null)).toBe('corpo');
  });
  it('AC-9.5: lê o modo guardado', () => {
    const a = memoria();
    salvarModo(a, 'cabeca');
    expect(lerModo(a)).toBe('cabeca');
  });
  it('valor inválido ou armazenamento bloqueado: usa Corpo e não lança erro', () => {
    expect(lerModo(memoria({ 'match-do-saber:modo': 'pe' }))).toBe('corpo');
    expect(lerModo(quebrado)).toBe('corpo');
    expect(() => salvarModo(quebrado, 'mao')).not.toThrow();
  });
  it('FR-9: guarda só a chave do modo', () => {
    const a = memoria();
    salvarModo(a, 'mao');
    expect(a.dados).toEqual({ 'match-do-saber:modo': 'mao' });
  });
  it('AC-9.14: dicas de cada modo', () => {
    expect(DICA_GESTOS.mao).toBe('Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais');
    expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais');
  });
});
