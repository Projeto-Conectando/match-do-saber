import { describe, expect, it } from 'vitest';
import {
  CONFIG_PADRAO, DICA_GESTOS, ITENS_CONFIG, MODOS, TEMPOS_CARD_S,
  lerConfiguracoes, mudarValor, resumoConfiguracoes, rotuloValor, salvarConfiguracoes, type Armazenamento,
} from './modos';

function memoria(inicial: Record<string, string> = {}): Armazenamento & { dados: Record<string, string> } {
  const dados = { ...inicial };
  return { dados, getItem: (k) => dados[k] ?? null, setItem: (k, v) => { dados[k] = v; } };
}
const quebrado: Armazenamento = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('bloqueado'); },
};

describe('configurações do estande', () => {
  it('itens e opções', () => {
    expect(MODOS).toEqual(['corpo', 'mao', 'cabeca']);
    expect(TEMPOS_CARD_S).toEqual([10, 15, 20, 25, 30]);
    expect(ITENS_CONFIG).toEqual(['modo', 'tempoCardS', 'som']);
  });
  it('AC-9.4: sem nada guardado, usa Corpo, 15 s e som ligado', () => {
    expect(CONFIG_PADRAO).toEqual({ modo: 'corpo', tempoCardS: 15, som: true });
    expect(lerConfiguracoes(memoria())).toEqual(CONFIG_PADRAO);
    expect(lerConfiguracoes(null)).toEqual(CONFIG_PADRAO);
  });
  it('AC-9.5: guarda e lê as três configurações', () => {
    const a = memoria();
    salvarConfiguracoes(a, { modo: 'cabeca', tempoCardS: 25, som: false });
    expect(lerConfiguracoes(a)).toEqual({ modo: 'cabeca', tempoCardS: 25, som: false });
  });
  it('mantém o modo guardado pela v1.1.0 (mesma chave)', () => {
    expect(lerConfiguracoes(memoria({ 'match-do-saber:modo': 'mao' }))).toEqual({ ...CONFIG_PADRAO, modo: 'mao' });
  });
  it('valor inválido vale o padrão só daquele item; armazenamento bloqueado não quebra', () => {
    const a = memoria({ 'match-do-saber:modo': 'pe', 'match-do-saber:tempoCard': '12', 'match-do-saber:som': 'desligado' });
    expect(lerConfiguracoes(a)).toEqual({ modo: 'corpo', tempoCardS: 15, som: false });
    expect(lerConfiguracoes(quebrado)).toEqual(CONFIG_PADRAO);
    expect(() => salvarConfiguracoes(quebrado, CONFIG_PADRAO)).not.toThrow();
  });
  it('FR-9: guarda só as três chaves', () => {
    const a = memoria();
    salvarConfiguracoes(a, { modo: 'mao', tempoCardS: 20, som: true });
    expect(a.dados).toEqual({ 'match-do-saber:modo': 'mao', 'match-do-saber:tempoCard': '20', 'match-do-saber:som': 'ligado' });
  });
  it('AC-9.17: ←/→ mudam o valor sem passar dos limites', () => {
    const c = { ...CONFIG_PADRAO, tempoCardS: 10 };
    expect(mudarValor(c, 'tempoCardS', -1).tempoCardS).toBe(10);
    expect(mudarValor(c, 'tempoCardS', 1).tempoCardS).toBe(15);
    expect(mudarValor({ ...c, tempoCardS: 30 }, 'tempoCardS', 1).tempoCardS).toBe(30);
    expect(mudarValor(CONFIG_PADRAO, 'modo', 1).modo).toBe('mao');
    expect(mudarValor(CONFIG_PADRAO, 'modo', -1).modo).toBe('corpo');
    expect(mudarValor(CONFIG_PADRAO, 'som', 1).som).toBe(false);
  });
  it('AC-9.2: rótulos e resumo', () => {
    expect(rotuloValor('tempoCardS', 20)).toBe('20 s');
    expect(rotuloValor('som', true)).toBe('Ligado');
    expect(rotuloValor('modo', 'cabeca')).toBe('Cabeça');
    expect(resumoConfiguracoes({ modo: 'mao', tempoCardS: 20, som: false })).toBe('Modo: Mão · Tempo por card: 20 s · Som: desligado');
  });
  it('AC-9.14: dicas de cada modo continuam iguais', () => {
    expect(DICA_GESTOS.mao).toBe('Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais');
    expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais');
  });
});
