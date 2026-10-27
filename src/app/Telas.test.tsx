// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Noticia } from '../core/types';
import { TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';

const noticia: Noticia = {
  id: 'n1', titulo: 'Título X', descricao: 'Descrição Y', saibaMais: 'Mais Z', imagem: 'content/img/n1.webp',
  veredito: 'falsa', explicacao: 'Explicação W', tecnica: 'imagem', fonteUrl: 'https://exemplo.org',
};

describe('telas', () => {
  it('AC-6.4: espera sem notícias', () => {
    render(<TelaEspera semNoticias camera="ativa" />);
    expect(screen.getByText('Nenhuma notícia publicada')).toBeInTheDocument();
  });
  it('espera com câmera negada orienta a usar as setas', () => {
    render(<TelaEspera semNoticias={false} camera="negada" />);
    expect(screen.getByText('Câmera desativada — jogue pelas setas (Enter para começar)')).toBeInTheDocument();
  });
  it('FR-4: card mostra imagem, título, descrição, cronômetro e dica do saiba mais', () => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={14200} saibaMais={false} ausente={false} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringContaining('content/img/n1.webp'));
    expect(screen.getByText('Título X')).toBeInTheDocument();
    expect(screen.getByText('Descrição Y')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/Saiba mais/)).toBeInTheDocument();
  });
  it('AC-3.1: saiba mais aberto mostra o texto expandido', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais ausente={false} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Mais Z')).toBeInTheDocument();
  });
  it('AC-5.3: ausente mostra "Volte para o centro"', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Volte para o centro')).toBeInTheDocument();
  });
  it.each([
    ['acerto', 'Acertou!'],
    ['erro', 'Errou'],
    ['tempo', 'Tempo esgotado'],
  ] as const)('AC-4.x: feedback %s mostra selo, veredito, explicação e técnica', (resultado, selo) => {
    render(<TelaFeedback noticia={noticia} resultado={resultado} />);
    expect(screen.getByText(selo)).toBeInTheDocument();
    expect(screen.getByText('É falsa')).toBeInTheDocument();
    expect(screen.getByText('Explicação W')).toBeInTheDocument();
    expect(screen.getByText('Verificar a imagem')).toBeInTheDocument();
  });
  it('AC-5.1: resumo com "N de M" e técnicas', () => {
    render(<TelaResumo pontos={7} total={10} tecnicas={['fonte', 'data']} />);
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
    expect(screen.getByText('Checar a fonte')).toBeInTheDocument();
    expect(screen.getByText('Conferir a data')).toBeInTheDocument();
  });
});
