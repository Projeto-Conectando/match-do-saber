// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Noticia } from '../core/types';
import { MenuModo, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';

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
    const { container } = render(<TelaCard noticia={noticia} restanteMs={14200} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringContaining('content/img/n1.webp'));
    expect(screen.getByText('Título X')).toBeInTheDocument();
    expect(screen.getByText('Descrição Y')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText(/Saiba mais/)).toBeInTheDocument();
  });
  it('AC-3.1: saiba mais aberto mostra o texto expandido', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Mais Z')).toBeInTheDocument();
  });
  it('AC-5.3: ausente mostra "Volte para o centro"', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Volte para o centro')).toBeInTheDocument();
  });
  it.each([
    ['direita', /saiDireita/],
    ['esquerda', /saiEsquerda/],
  ] as const)('AC-2.1/AC-2.2: card respondido sai pela %s', (saida, classe) => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} saida={saida} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('article')!.className).toMatch(classe);
  });
  it('card sem resposta não tem classe de saída', () => {
    const { container } = render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(container.querySelector('article')!.className).not.toMatch(/sai(Direita|Esquerda)/);
  });
  it.each([
    ['acerto', 'Acertou!'],
    ['erro', 'Errou'],
    ['tempo', 'Tempo esgotado'],
  ] as const)('AC-4.x: feedback %s mostra selo, veredito, explicação e técnica', (resultado, selo) => {
    render(<TelaFeedback noticia={noticia} resultado={resultado} pontos={0} />);
    expect(screen.getByText(selo)).toBeInTheDocument();
    expect(screen.getByText('É falsa')).toBeInTheDocument();
    expect(screen.getByText('Explicação W')).toBeInTheDocument();
    expect(screen.getByText('Verificar a imagem')).toBeInTheDocument();
  });
  it('AC-4.1: card mostra o placar parcial', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={3} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Pontos: 3')).toBeInTheDocument();
  });
  it('AC-4.1: feedback mostra o placar já com o card respondido', () => {
    render(<TelaFeedback noticia={noticia} resultado="acerto" pontos={4} />);
    expect(screen.getByText('Pontos: 4')).toBeInTheDocument();
  });
  it('AC-5.1: resumo com "N de M" e técnicas', () => {
    render(<TelaResumo pontos={7} total={10} tecnicas={['fonte', 'data']} />);
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
    expect(screen.getByText('Checar a fonte')).toBeInTheDocument();
    expect(screen.getByText('Conferir a data')).toBeInTheDocument();
  });
});

describe('modos de jogo (v1.1.0)', () => {
  it('AC-9.1/AC-9.2: espera mostra o modo ativo e abre o menu', () => {
    const abrir = vi.fn();
    render(<TelaEspera semNoticias={false} camera="ativa" modo="mao" onAbrirMenu={abrir} />);
    fireEvent.click(screen.getByRole('button', { name: '⚙ Modo de jogo: Mão' }));
    expect(abrir).toHaveBeenCalledOnce();
  });
  it('AC-9.1: menu lista os três modos, com o ativo marcado', () => {
    const escolher = vi.fn();
    render(<MenuModo ativo="corpo" destacado={0} onEscolher={escolher} onFechar={() => {}} />);
    const menu = screen.getByRole('dialog', { name: 'Modo de jogo' });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Corpo \(padrão\)/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Cabeça/ }));
    expect(escolher).toHaveBeenCalledWith('cabeca');
  });
  it.each([
    ['mao', 'Mão direita: é verdade · Mão esquerda: é falsa · Duas mãos para cima: saiba mais'],
    ['cabeca', 'Cabeça para a direita: é verdade · Cabeça para a esquerda: é falsa · Queixo para cima: saiba mais'],
  ] as const)('AC-9.14: calibração e card mostram os gestos do modo %s', (modo, dica) => {
    const { unmount } = render(<TelaCalibracao progresso={0} modo={modo} />);
    expect(screen.getByText(dica)).toBeInTheDocument();
    unmount();
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} modo={modo} cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText(dica)).toBeInTheDocument();
  });
  it('AC-9.14: no modo Cabeça, a dica do saiba mais fala do queixo', () => {
    render(<TelaCard noticia={noticia} restanteMs={1000} saibaMais={false} ausente={false} pontos={0} modo="cabeca" cardRef={{ current: null }} onArrastar={() => {}} />);
    expect(screen.getByText('Saiba mais: levante o queixo (ou ↑)')).toBeInTheDocument();
  });
});
