import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { Catalogo, Noticia, Tecnica, Veredito } from '../../src/core/types';
import { driveFileId, lerLinhas, validarLinhas, type Descarte } from './validar';

export interface FonteConteudo {
  lerValores(): Promise<string[][]>;
  baixarImagem(fileId: string): Promise<Buffer>;
}

export async function sincronizar(
  fonte: FonteConteudo,
  destino: string,
  agora: Date = new Date(),
): Promise<{ catalogo: Catalogo; descartes: Descarte[] }> {
  const valores = await fonte.lerValores();
  const { aprovadas, descartes } = validarLinhas(lerLinhas(valores));

  const dirImg = join(destino, 'img');
  await rm(dirImg, { recursive: true, force: true });
  await mkdir(dirImg, { recursive: true });

  const noticias: Noticia[] = [];
  for (const l of aprovadas) {
    try {
      const original = await fonte.baixarImagem(driveFileId(l.imagem)!);
      await sharp(original)
        .rotate()
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(join(dirImg, `${l.id}.webp`));
    } catch {
      descartes.push({ linha: l.linha, id: l.id, motivo: 'imagem inacessível' });
      continue;
    }
    noticias.push({
      id: l.id,
      titulo: l.titulo,
      descricao: l.descricao,
      saibaMais: l.saiba_mais,
      imagem: `content/img/${l.id}.webp`,
      veredito: l.veredito as Veredito,
      explicacao: l.explicacao,
      tecnica: l.tecnica as Tecnica,
      fonteUrl: l.fonte_url,
    });
  }
  descartes.sort((a, b) => a.linha - b.linha);

  const catalogo: Catalogo = { versao: agora.toISOString(), noticias };
  await writeFile(join(destino, 'noticias.json'), JSON.stringify(catalogo, null, 2));
  return { catalogo, descartes };
}

export function resumoMarkdown(r: { catalogo: Catalogo; descartes: Descarte[] }): string {
  const linhas = [
    '## Publicação do Match do Saber',
    '',
    `${r.catalogo.noticias.length} notícia(s) publicada(s). ${r.descartes.length} linha(s) não publicada(s).`,
  ];
  if (r.descartes.length > 0) {
    linhas.push('', '| Linha | id | Motivo |', '|---|---|---|');
    for (const d of r.descartes) linhas.push(`| ${d.linha} | ${d.id || '(vazio)'} | ${d.motivo} |`);
  }
  return linhas.join('\n') + '\n';
}
