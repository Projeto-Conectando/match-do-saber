import { describe, expect, it } from 'vitest';
import { COLUNAS, lerLinhas, validarLinhas, type LinhaPlanilha } from './validar';

const base: Omit<LinhaPlanilha, 'linha'> = {
  id: 'n1', titulo: 'Título', descricao: 'Desc', saiba_mais: 'Mais',
  imagem: 'https://drive.google.com/file/d/ABC123/view', veredito: 'falsa',
  explicacao: 'Expl', tecnica: 'fonte', fonte_url: 'https://exemplo.org',
  revisado_por: 'Ana', status: 'aprovada',
};
const l = (linha: number, over: Partial<LinhaPlanilha> = {}): LinhaPlanilha => ({ ...base, linha, ...over });

describe('lerLinhas', () => {
  it('mapeia pelo cabeçalho, numera a partir da linha 2 e ignora linhas vazias', () => {
    const valores = [
      [...COLUNAS],
      COLUNAS.map((c) => (base as Record<string, string>)[c] ?? ''),
      [],
      ['', '', ''],
    ];
    const linhas = lerLinhas(valores);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ linha: 2, id: 'n1', status: 'aprovada' });
  });

  it('apara espaços e normaliza enums para minúsculas', () => {
    const valores = [[...COLUNAS], COLUNAS.map((c) => {
      const v = (base as Record<string, string>)[c] ?? '';
      return c === 'status' ? ' Aprovada ' : c === 'veredito' ? 'FALSA' : v;
    })];
    expect(lerLinhas(valores)[0]).toMatchObject({ status: 'aprovada', veredito: 'falsa' });
  });
});

describe('validarLinhas', () => {
  it('aprova linha completa', () => {
    const r = validarLinhas([l(2)]);
    expect(r.aprovadas.map((x) => x.id)).toEqual(['n1']);
    expect(r.descartes).toEqual([]);
  });

  it.each([
    [{ status: 'rascunho' }, 'status não é "aprovada"'],
    [{ fonte_url: '' }, 'campo obrigatório vazio: fonte_url'],
    [{ revisado_por: '' }, 'campo obrigatório vazio: revisado_por'],
    [{ fonte_url: 'exemplo.org' }, 'fonte_url não é um link http(s) válido'],
    [{ veredito: 'talvez' }, 'veredito deve ser "verdadeira" ou "falsa"'],
    [{ tecnica: 'sorte' }, 'tecnica deve ser fonte, data, imagem ou contexto'],
    [{ id: 'com espaço' }, 'id só pode ter letras, números e hífen'],
    [{ titulo: 'x'.repeat(101) }, 'titulo com mais de 100 caracteres'],
    [{ descricao: 'x'.repeat(221) }, 'descricao com mais de 220 caracteres'],
    [{ saiba_mais: 'x'.repeat(1201) }, 'saiba_mais com mais de 1200 caracteres'],
    [{ imagem: 'https://exemplo.org/foto.jpg' }, 'imagem não é um link do Google Drive'],
  ])('descarta %o com motivo', (over, motivo) => {
    const r = validarLinhas([l(5, over as Partial<LinhaPlanilha>)]);
    expect(r.aprovadas).toEqual([]);
    expect(r.descartes).toEqual([{ linha: 5, id: (over as { id?: string }).id ?? 'n1', motivo }]);
  });

  it('descarta todas as linhas com id duplicado', () => {
    const r = validarLinhas([l(2), l(3), l(4, { id: 'n2' })]);
    expect(r.aprovadas.map((x) => x.id)).toEqual(['n2']);
    expect(r.descartes).toEqual([
      { linha: 2, id: 'n1', motivo: 'id duplicado' },
      { linha: 3, id: 'n1', motivo: 'id duplicado' },
    ]);
  });
});
