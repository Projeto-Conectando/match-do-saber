export type Veredito = 'verdadeira' | 'falsa';
export type Tecnica = 'fonte' | 'data' | 'imagem' | 'contexto';

export const VEREDITOS: readonly Veredito[] = ['verdadeira', 'falsa'];
export const TECNICAS: readonly Tecnica[] = ['fonte', 'data', 'imagem', 'contexto'];

export const TECNICA_ROTULO: Record<Tecnica, string> = {
  fonte: 'Checar a fonte',
  data: 'Conferir a data',
  imagem: 'Verificar a imagem',
  contexto: 'Analisar o contexto',
};

export interface Noticia {
  id: string;
  titulo: string;
  descricao: string;
  saibaMais: string;
  imagem: string;
  veredito: Veredito;
  explicacao: string;
  tecnica: Tecnica;
  fonteUrl: string;
}

export interface Catalogo {
  versao: string;
  noticias: Noticia[];
}
