// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Noticia } from '../core/types';
import { BarraTempo, BotaoSair, MenuConfiguracoes, TelaCalibracao, TelaCard, TelaEspera, TelaFeedback, TelaResumo } from './Telas';

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
    expect(screen.getByRole('timer', { name: 'Tempo restante' })).toHaveTextContent('15 s');
    expect(container.querySelector('article')).not.toHaveTextContent(/^\d+$/m);
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
  it('AC-13.2: resumo com foto mostra o polaroid com a faixa "Match do Saber · N de M"', () => {
    const foto = 'data:image/jpeg;base64,AAA';
    const { container } = render(<TelaResumo pontos={7} total={10} tecnicas={['fonte']} foto={foto} />);
    expect(container.querySelector('figure')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sua foto na partida' })).toHaveAttribute('src', foto);
    expect(screen.getByText('Match do Saber · 7 de 10')).toBeInTheDocument();
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
    expect(screen.getByText('Checar a fonte')).toBeInTheDocument();
  });
  it.each([
    ['sem a prop foto', undefined],
    ['com foto={null}', null],
  ])('AC-13.3: resumo %s não tem polaroid', (_, foto) => {
    const { container } = render(<TelaResumo pontos={7} total={10} tecnicas={['fonte']} foto={foto} />);
    expect(container.querySelector('figure')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('7 de 10')).toBeInTheDocument();
  });
});

describe('modos de jogo (v1.1.0)', () => {
  it.each([
    ['mao', 'É verdade: mão direita para cima, as duas mãos para a direita ou arraste para a direita · É falsa: o mesmo para a esquerda · Duas mãos para cima: saiba mais'],
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

describe('v2.0.0: configurações, iniciar e sair', () => {
  it('AC-9.2/AC-10.1: espera mostra o resumo, Iniciar e Configurações', () => {
    const iniciar = vi.fn();
    const abrir = vi.fn();
    render(<TelaEspera semNoticias={false} camera="ativa" config={{ modo: 'mao', tempoCardS: 20, som: false, foto: false }} onAbrirMenu={abrir} onIniciar={iniciar} />);
    expect(screen.getByText('Modo: Mão · Tempo por card: 20 s · Som: desligado · Foto: desligada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configurações' })).toHaveTextContent('⚙');
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(iniciar).toHaveBeenCalledOnce();
    expect(abrir).toHaveBeenCalledOnce();
  });
  it('AC-10.2: sem notícias, Iniciar fica desativado', () => {
    render(<TelaEspera semNoticias camera="ativa" />);
    expect(screen.getByRole('button', { name: '▶ Iniciar' })).toBeDisabled();
  });
  it('AC-9.1: menu mostra os quatro itens com os valores atuais marcados', () => {
    const definir = vi.fn();
    render(<MenuConfiguracoes config={{ modo: 'corpo', tempoCardS: 15, som: true, foto: true }} itemDestacado={0} onDefinir={definir} onFechar={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Modo de jogo' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tempo por card' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Som' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Foto no resumo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '◉ Corpo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '◉ 15 s' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '◉ Ligado' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '◉ Ligada' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '○ 25 s' }));
    expect(definir).toHaveBeenCalledWith({ modo: 'corpo', tempoCardS: 25, som: true, foto: true });
    // AC-9.3/AC-9.18: o "✕" no topo do painel fecha
    const fechar = screen.getByRole('button', { name: 'Fechar' });
    expect(fechar).toHaveTextContent('✕');
  });
  it('AC-10.5: botão Sair tem nome acessível "Sair da partida"', () => {
    const sair = vi.fn();
    render(<BotaoSair onSair={sair} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
    expect(sair).toHaveBeenCalledOnce();
  });
  it('v3.0.0: com câmera ativa, a espera manda apertar Iniciar e não promete início sozinho', () => {
    render(<TelaEspera semNoticias={false} camera="ativa" />);
    expect(screen.getByText('Aperte ▶ Iniciar (ou Enter) e fique de frente para a câmera')).toBeInTheDocument();
    expect(screen.queryByText(/Chegue mais perto/)).not.toBeInTheDocument();
  });
});

describe('v4.0.0: barra de tempo e pulso', () => {
  const props = { noticia, saibaMais: false, ausente: false, pontos: 0, totalMs: 15000, cardRef: { current: null }, onArrastar: () => {} };
  it('AC-4.6: barra mostra os segundos e a fração restante', () => {
    render(<BarraTempo restanteMs={7500} totalMs={15000} alerta={false} />);
    const barra = screen.getByRole('timer', { name: 'Tempo restante' });
    expect(barra).toHaveTextContent('8 s');
    expect(barra.firstElementChild).toHaveStyle({ width: '50%' });
  });
  it('AC-4.7: com 5 s ou menos e cronômetro correndo, o card pulsa e a barra fica em alerta', () => {
    const { container } = render(<TelaCard {...props} restanteMs={5000} />);
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
    expect(screen.getByRole('timer').className).toMatch(/barraAlerta/);
  });
  it('AC-4.7: acima de 5 s não pulsa', () => {
    const { container } = render(<TelaCard {...props} restanteMs={5001} />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
    expect(screen.getByRole('timer').className).not.toMatch(/barraAlerta/);
  });
  it('AC-4.7 (v5.0.0): pausado por "Volte para o centro" não pulsa', () => {
    const { container } = render(<TelaCard {...props} ausente restanteMs={3000} />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
  });
  it('AC-4.7 (v5.0.0): com o saiba mais aberto o cronômetro corre, então o card pulsa nos últimos 5 s', () => {
    const { container } = render(<TelaCard {...props} saibaMais restanteMs={3000} />);
    expect(container.querySelector('article')!.className).toMatch(/pulsando/);
    expect(screen.getByRole('timer').className).toMatch(/barraAlerta/);
  });
  it('card saindo não mostra a barra nem pulsa', () => {
    const { container } = render(<TelaCard {...props} restanteMs={3000} saida="direita" />);
    expect(container.querySelector('article')!.className).not.toMatch(/pulsando/);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
