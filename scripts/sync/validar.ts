export const COLUNAS = [
  'id', 'titulo', 'descricao', 'saiba_mais', 'imagem', 'veredito',
  'explicacao', 'tecnica', 'fonte_url', 'revisado_por', 'status',
] as const;
export type Coluna = (typeof COLUNAS)[number];
export type LinhaPlanilha = Record<Coluna, string> & { linha: number };
export interface Descarte { linha: number; id: string; motivo: string }

export function lerLinhas(_valores: string[][]): LinhaPlanilha[] {
  throw new Error('não implementado');
}

export function validarLinhas(_linhas: LinhaPlanilha[]): { aprovadas: LinhaPlanilha[]; descartes: Descarte[] } {
  throw new Error('não implementado');
}
