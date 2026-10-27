import sharp from 'sharp';
import { sincronizar } from './sync/sincronizar';
import { COLUNAS } from './sync/validar';

const tecnicas = ['fonte', 'data', 'imagem', 'contexto'];
const cores = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261'];
const linhas = Array.from({ length: 12 }, (_, i) => {
  const v: Record<string, string> = {
    id: `teste-${i + 1}`,
    titulo: `Notícia de teste ${i + 1}: manchete bombástica que você precisa ver`,
    descricao: 'Descrição curta de teste para o card, com até duas linhas de texto.',
    saiba_mais: 'Texto expandido de teste. '.repeat(8),
    imagem: `https://drive.google.com/file/d/FIXTURE_${i}_0000/view`,
    veredito: i % 2 === 0 ? 'verdadeira' : 'falsa',
    explicacao: `Explicação de teste ${i + 1}.`,
    tecnica: tecnicas[i % 4]!,
    fonte_url: 'https://exemplo.org/fonte',
    revisado_por: 'Equipe de teste',
    status: 'aprovada',
  };
  return COLUNAS.map((c) => v[c] ?? '');
});

const r = await sincronizar(
  {
    lerValores: async () => [[...COLUNAS], ...linhas],
    baixarImagem: async (id) => {
      const i = Number(id.split('_')[1]);
      return sharp({ create: { width: 800, height: 600, channels: 3, background: cores[i % 4]! } }).png().toBuffer();
    },
  },
  'public/content',
);
console.log(`Fixture: ${r.catalogo.noticias.length} notícias em public/content`);
