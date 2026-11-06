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
    expect(ITENS_CONFIG).toEqual(['modo', 'tempoCardS', 'som', 'foto']);
  });
  it('AC-9.4: sem nada guardado, usa Corpo, 15 s, som ligado e foto ligada', () => {
    expect(CONFIG_PADRAO).toEqual({ modo: 'corpo', tempoCardS: 15, som: true, foto: true });
    expect(lerConfiguracoes(memoria())).toEqual(CONFIG_PADRAO);
    expect(lerConfiguracoes(null)).toEqual(CONFIG_PADRAO);
  });
  it('AC-9.5: guarda e lê as quatro configurações', () => {
    const a = memoria();
    salvarConfiguracoes(a, { modo: 'cabeca', tempoCardS: 25, som: false, foto: false });
    expect(lerConfiguracoes(a)).toEqual({ modo: 'cabeca', tempoCardS: 25, som: false, foto: false });
  });
  it('mantém o modo guardado pela v1.1.0 (mesma chave)', () => {
    expect(lerConfiguracoes(memoria({ 'match-do-saber:modo': 'mao' }))).toEqual({ ...CONFIG_PADRAO, modo: 'mao' });
  });
  it('valor inválido vale o padrão só daquele item; armazenamento bloqueado não quebra', () => {
    const a = memoria({ 'match-do-saber:modo': 'pe', 'match-do-saber:tempoCard': '12', 'match-do-saber:som': 'desligado', 'match-do-saber:foto': 'talvez' });
    expect(lerConfiguracoes(a)).toEqual({ modo: 'corpo', tempoCardS: 15, som: false, foto: true });
    expect(lerConfiguracoes(memoria({ 'match-do-saber:foto': 'desligada' })).foto).toBe(false);
    expect(lerConfiguracoes(memoria({ 'match-do-saber:foto': 'ligada' })).foto).toBe(true);
    expect(lerConfiguracoes(quebrado)).toEqual(CONFIG_PADRAO);
    expect(() => salvarConfiguracoes(quebrado, CONFIG_PADRAO)).not.toThrow();
  });
  it('FR-9: guarda só as quatro chaves', () => {
    const a = memoria();
    salvarConfiguracoes(a, { modo: 'mao', tempoCardS: 20, som: true, foto: false });
    expect(a.dados).toEqual({ 'match-do-saber:modo': 'mao', 'match-do-saber:tempoCard': '20', 'match-do-saber:som': 'ligado', 'match-do-saber:foto': 'desligada' });
    salvarConfiguracoes(a, CONFIG_PADRAO);
    expect(a.dados['match-do-saber:foto']).toBe('ligada');
  });
  it('AC-9.17: ←/→ mudam o valor sem passar dos limites', () => {
    const c = { ...CONFIG_PADRAO, tempoCardS: 10 };
    expect(mudarValor(c, 'tempoCardS', -1).tempoCardS).toBe(10);
    expect(mudarValor(c, 'tempoCardS', 1).tempoCardS).toBe(15);
    expect(mudarValor({ ...c, tempoCardS: 30 }, 'tempoCardS', 1).tempoCardS).toBe(30);
    expect(mudarValor(CONFIG_PADRAO, 'modo', 1).modo).toBe('mao');
    expect(mudarValor(CONFIG_PADRAO, 'modo', -1).modo).toBe('corpo');
    expect(mudarValor(CONFIG_PADRAO, 'som', 1).som).toBe(false);
    expect(mudarValor(CONFIG_PADRAO, 'foto', 1).foto).toBe(false);
  });
  it('AC-9.2: rótulos e resumo', () => {
    expect(rotuloValor('tempoCardS', 20)).toBe('20 s');
    expect(rotuloValor('som', true)).toBe('Ligado');
    expect(rotuloValor('modo', 'cabeca')).toBe('Cabeça');
    expect(rotuloValor('foto', true)).toBe('Ligada');
    expect(rotuloValor('foto', false)).toBe('Desligada');
    expect(resumoConfiguracoes({ modo: 'mao', tempoCardS: 20, som: false, foto: false })).toBe('Modo: Mão · Tempo por card: 20 s · Som: desligado · Foto: desligada');
  });
  it('AC-9.14: dicas de cada modo continuam iguais', () => {
    expect(DICA_GESTOS.mao).toBe('É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais');
    expect(DICA_GESTOS.cabeca).toBe('Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais');
  });
  it('AC-2.9: dica do modo Corpo cita o corpo e o braço', () => {
    expect(DICA_GESTOS.corpo).toBe('Corpo ou braço para a direita: é verdade · Para a esquerda: é falsa · Duas mãos para cima: saiba mais');
  });
});
