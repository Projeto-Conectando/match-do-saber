import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { resumoMarkdown, sincronizar, type FonteConteudo } from './sincronizar';
import { COLUNAS } from './validar';

const linha = (id: string, over: Record<string, string> = {}) => {
  const v: Record<string, string> = {
    id, titulo: `Título ${id}`, descricao: 'Desc', saiba_mais: 'Mais',
    imagem: `https://drive.google.com/file/d/IMG_${id}_0000000/view`, veredito: 'verdadeira',
    explicacao: 'Expl', tecnica: 'data', fonte_url: 'https://exemplo.org', revisado_por: 'Ana',
    status: 'aprovada', ...over,
  };
  return COLUNAS.map((c) => v[c] ?? '');
};

async function png(): Promise<Buffer> {
  return sharp({ create: { width: 1600, height: 900, channels: 3, background: '#f00' } }).png().toBuffer();
}

describe('sincronizar', () => {
  it('gera catálogo, imagens webp ≤ 800px e lista descartes', async () => {
    const destino = await mkdtemp(join(tmpdir(), 'mds-'));
    const fonte: FonteConteudo = {
      lerValores: async () => [[...COLUNAS], linha('a'), linha('b', { status: 'rascunho' }), linha('c')],
      baixarImagem: async (fileId) => {
        if (fileId === 'IMG_c_0000000') throw new Error('403');
        return png();
      },
    };
    const r = await sincronizar(fonte, destino, new Date('2026-10-26T12:00:00Z'));

    expect(r.catalogo.noticias.map((n) => n.id)).toEqual(['a']);
    expect(r.catalogo.noticias[0]).toMatchObject({ imagem: 'content/img/a.webp', saibaMais: 'Mais', fonteUrl: 'https://exemplo.org' });
    expect(r.catalogo.noticias[0]).not.toHaveProperty('revisado_por');
    expect(r.descartes).toEqual([
      { linha: 3, id: 'b', motivo: 'status não é "aprovada"' },
      { linha: 4, id: 'c', motivo: 'imagem inacessível' },
    ]);

    const json = JSON.parse(await readFile(join(destino, 'noticias.json'), 'utf8'));
    expect(json).toEqual(r.catalogo);
    const meta = await sharp(join(destino, 'img', 'a.webp')).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(800);
    await expect(stat(join(destino, 'img', 'c.webp'))).rejects.toThrow();
  });

  it('propaga erro quando a planilha não pode ser lida', async () => {
    const destino = await mkdtemp(join(tmpdir(), 'mds-'));
    const fonte: FonteConteudo = {
      lerValores: async () => { throw new Error('planilha inacessível'); },
      baixarImagem: async () => png(),
    };
    await expect(sincronizar(fonte, destino)).rejects.toThrow('planilha inacessível');
    await expect(stat(join(destino, 'noticias.json'))).rejects.toThrow();
  });
});

describe('resumoMarkdown', () => {
  it('lista publicadas e descartes com motivo', () => {
    const md = resumoMarkdown({
      catalogo: { versao: 'v', noticias: [{ id: 'a' } as never] },
      descartes: [{ linha: 3, id: 'b', motivo: 'status não é "aprovada"' }],
    });
    expect(md).toContain('1 notícia(s) publicada(s)');
    expect(md).toContain('| 3 | b | status não é "aprovada" |');
  });
});
