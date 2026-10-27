import { useRef, type RefObject } from 'react';
import { DICA_GESTOS, DICA_SAIBA_MAIS, MODO_ROTULO, MODOS, type ModoJogo } from '../core/modos';
import type { Resultado } from '../core/partida';
import { TECNICA_ROTULO, type Noticia, type Tecnica } from '../core/types';
import type { StatusCamera } from './useJogo';
import s from './App.module.css';

const SELO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
const src = (caminho: string) => `${import.meta.env.BASE_URL}${caminho}`;

function Placar({ pontos }: { pontos: number }) {
  return <p className={s.pontos}>{`Pontos: ${pontos}`}</p>;
}

export function TelaEspera({ semNoticias, camera, modo = 'corpo', onAbrirMenu = () => {} }: {
  semNoticias: boolean;
  camera: StatusCamera;
  modo?: ModoJogo;
  onAbrirMenu?: () => void;
}) {
  return (
    <main className={s.centro}>
      <h1 className={s.logo}>Match do Saber</h1>
      {semNoticias ? (
        <p className={s.aviso}>Nenhuma notícia publicada</p>
      ) : camera === 'negada' || camera === 'indisponivel' ? (
        <p className={s.aviso}>Câmera desativada — jogue pelas setas (Enter para começar)</p>
      ) : (
        <p className={s.chamada}>Chegue mais perto e fique de frente para a câmera para jogar</p>
      )}
      <button
        type="button"
        className={s.botaoModo}
        // Tira o foco: um Enter depois não deve reativar o botão.
        onClick={(e) => { e.currentTarget.blur(); onAbrirMenu(); }}
      >
        {`⚙ Modo de jogo: ${MODO_ROTULO[modo]}`}
      </button>
    </main>
  );
}

export function TelaCalibracao({ progresso, modo = 'corpo' }: { progresso: number; modo?: ModoJogo }) {
  return (
    <main className={s.centro}>
      <p className={s.chamada}>Fique no centro</p>
      <div className={s.barra}><div style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
      <p className={s.dica}>{DICA_GESTOS[modo]}</p>
    </main>
  );
}

export function MenuModo({ ativo, destacado, onEscolher, onFechar }: {
  ativo: ModoJogo;
  destacado: number;
  onEscolher: (modo: ModoJogo) => void;
  onFechar: () => void;
}) {
  return (
    <div className={s.sobreposicao} role="dialog" aria-modal="true" aria-label="Modo de jogo">
      <div className={s.menu}>
        <h2>Modo de jogo</h2>
        <ul>
          {MODOS.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                className={i === destacado ? s.destacado : undefined}
                aria-pressed={m === ativo}
                onClick={() => onEscolher(m)}
              >
                {`${m === ativo ? '◉' : '○'} ${MODO_ROTULO[m]}${m === 'corpo' ? ' (padrão)' : ''}`}
              </button>
              <p className={s.dica}>{DICA_GESTOS[m]}</p>
            </li>
          ))}
        </ul>
        <p className={s.dica}>↑/↓ e Enter para escolher · Esc para fechar</p>
        <button type="button" onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );
}

export function TelaCard({ noticia, restanteMs, saibaMais, ausente, saida, pontos, modo = 'corpo', cardRef, onArrastar }: {
  noticia: Noticia;
  restanteMs: number;
  saibaMais: boolean;
  ausente: boolean;
  /** Card já respondido saindo pela direita/esquerda (AC-2.1/AC-2.2). */
  saida?: 'direita' | 'esquerda';
  /** Placar parcial (AC-4.1). */
  pontos: number;
  modo?: ModoJogo;
  cardRef: RefObject<HTMLElement>;
  onArrastar: (lado: 'direita' | 'esquerda') => void;
}) {
  const inicioX = useRef<number | null>(null);
  return (
    <main className={s.mesa}>
      <div className={s.lado}>✗ Falsa</div>
      <article
        ref={cardRef}
        className={saida ? `${s.card} ${saida === 'direita' ? s.saiDireita : s.saiEsquerda}` : s.card}
        onPointerDown={(e) => { inicioX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (inicioX.current === null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if (dx > 100) onArrastar('direita');
          else if (dx < -100) onArrastar('esquerda');
        }}
      >
        {!saida && <div className={s.cronometro}>{Math.ceil(restanteMs / 1000)}</div>}
        {saibaMais ? (
          <div className={s.saibaMais}>
            <h2>{noticia.titulo}</h2>
            <p>{noticia.saibaMais}</p>
          </div>
        ) : (
          <>
            <img src={src(noticia.imagem)} alt="" draggable={false} />
            <h2>{noticia.titulo}</h2>
            <p>{noticia.descricao}</p>
            <p className={s.dica}>{DICA_SAIBA_MAIS[modo]}</p>
          </>
        )}
      </article>
      <div className={s.lado}>Verdade ✓</div>
      {/* Fora do card, para não tirar espaço do texto da notícia (FR-4). */}
      {modo !== 'corpo' && <p className={s.dicaModo}>{DICA_GESTOS[modo]}</p>}
      <Placar pontos={pontos} />
      {ausente && <div className={s.sobreposicao}>Volte para o centro</div>}
    </main>
  );
}

export function TelaFeedback({ noticia, resultado, pontos }: { noticia: Noticia; resultado: Resultado; pontos: number }) {
  return (
    <main className={s.centro}>
      <p className={`${s.selo} ${s[resultado]}`}>{SELO[resultado]}</p>
      <h2>{noticia.veredito === 'verdadeira' ? 'É verdadeira' : 'É falsa'}</h2>
      <p className={s.explicacao}>{noticia.explicacao}</p>
      <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
      <Placar pontos={pontos} />
    </main>
  );
}

export function TelaResumo({ pontos, total, tecnicas }: { pontos: number; total: number; tecnicas: Tecnica[] }) {
  return (
    <main className={s.centro}>
      <h1>Fim de jogo!</h1>
      <p className={s.placar}>{`${pontos} de ${total}`}</p>
      <h2>Técnicas que você praticou</h2>
      <ul className={s.tecnicas}>{tecnicas.map((t) => <li key={t}>{TECNICA_ROTULO[t]}</li>)}</ul>
      <p className={s.dica}>Operador: Enter para a próxima partida</p>
    </main>
  );
}
