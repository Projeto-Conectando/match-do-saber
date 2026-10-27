export const COLUNAS = [
  'id', 'titulo', 'descricao', 'saiba_mais', 'imagem', 'veredito',
  'explicacao', 'tecnica', 'fonte_url', 'revisado_por', 'status',
] as const;
export type Coluna = (typeof COLUNAS)[number];
export type LinhaPlanilha = Record<Coluna, string> & { linha: number };
export interface Descarte { linha: number; id: string; motivo: string }

const ENUMS: readonly Coluna[] = ['veredito', 'tecnica', 'status'];
const LIMITES: Partial<Record<Coluna, number>> = { titulo: 100, descricao: 220, saiba_mais: 1200 };

export function driveFileId(link: string): string | null {
  const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/.exec(link);
  return m?.[1] ?? null;
}

export function lerLinhas(valores: string[][]): LinhaPlanilha[] {
  const [cabecalho = [], ...resto] = valores;
  const indice = new Map(cabecalho.map((h, i) => [h.trim().toLowerCase(), i]));
  const linhas: LinhaPlanilha[] = [];
  resto.forEach((cells, i) => {
    if (cells.every((c) => (c ?? '').trim() === '')) return;
    const linha = { linha: i + 2 } as LinhaPlanilha;
    for (const col of COLUNAS) {
      const pos = indice.get(col);
      let v = (pos === undefined ? '' : cells[pos] ?? '').trim();
      if (ENUMS.includes(col)) v = v.toLowerCase();
      linha[col] = v;
    }
    linhas.push(linha);
  });
  return linhas;
}

function motivo(l: LinhaPlanilha): string | null {
  if (l.status !== 'aprovada') return 'status não é "aprovada"';
  for (const col of COLUNAS) if (l[col] === '') return `campo obrigatório vazio: ${col}`;
  if (!/^[a-z0-9-]+$/i.test(l.id)) return 'id só pode ter letras, números e hífen';
  if (l.veredito !== 'verdadeira' && l.veredito !== 'falsa') return 'veredito deve ser "verdadeira" ou "falsa"';
  if (!['fonte', 'data', 'imagem', 'contexto'].includes(l.tecnica)) return 'tecnica deve ser fonte, data, imagem ou contexto';
  if (!/^https?:\/\/[^\s.]+\.[^\s]+$/.test(l.fonte_url)) return 'fonte_url não é um link http(s) válido';
  for (const [col, max] of Object.entries(LIMITES) as [Coluna, number][]) {
    if (l[col].length > max) return `${col} com mais de ${max} caracteres`;
  }
  if (!driveFileId(l.imagem)) return 'imagem não é um link do Google Drive';
  return null;
}

export function validarLinhas(linhas: LinhaPlanilha[]): { aprovadas: LinhaPlanilha[]; descartes: Descarte[] } {
  const contagem = new Map<string, number>();
  for (const l of linhas) if (l.id) contagem.set(l.id, (contagem.get(l.id) ?? 0) + 1);
  const aprovadas: LinhaPlanilha[] = [];
  const descartes: Descarte[] = [];
  for (const l of linhas) {
    const m = (contagem.get(l.id) ?? 0) > 1 ? 'id duplicado' : motivo(l);
    if (m) descartes.push({ linha: l.linha, id: l.id, motivo: m });
    else aprovadas.push(l);
  }
  return { aprovadas, descartes };
}
