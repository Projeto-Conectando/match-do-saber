import { useRef, type RefObject } from 'react';
import {
  CONFIG_PADRAO, DICA_GESTOS, DICA_SAIBA_MAIS, ITENS_CONFIG, OPCOES, ROTULO_ITEM, resumoConfiguracoes, rotuloValor,
  type Configuracoes, type ModoJogo,
} from '../core/modos';
import { mensagemResumo, type Resultado } from '../core/partida';
import { TECNICA_ROTULO, type Noticia, type Tecnica } from '../core/types';
import type { StatusCamera } from './useJogo';
import s from './App.module.css';

const SELO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
const src = (caminho: string) => `${import.meta.env.BASE_URL}${caminho}`;

function Placar({ pontos }: { pontos: number }) {
  return <p className={s.pontos}>{`Pontos: ${pontos}`}</p>;
}

export function TelaEspera({ semNoticias, camera, config = CONFIG_PADRAO, onAbrirMenu = () => {}, onIniciar = () => {} }: {
  semNoticias: boolean;
  camera: StatusCamera;
  config?: Configuracoes;
  onAbrirMenu?: () => void;
  onIniciar?: () => void;
}) {
  return (
    <main className={s.centro}>
      <h1 className={s.logo}>Match do Saber</h1>
      {semNoticias ? (
        <p className={s.aviso}>Nenhuma notícia publicada</p>
      ) : camera === 'negada' || camera === 'indisponivel' ? (
        <p className={s.aviso}>Câmera desativada — jogue pelas setas (Enter para começar)</p>
      ) : (
        <p className={s.chamada}>Aperte ▶ Iniciar (ou Enter) e fique de frente para a câmera</p>
      )}
      <div className={s.botoes}>
        {/* Os botões perdem o foco no clique: um Enter depois não deve reativá-los. */}
        <button type="button" className={s.botaoIniciar} disabled={semNoticias} onClick={(e) => { e.currentTarget.blur(); onIniciar(); }}>
          ▶ Iniciar
        </button>
      </div>
      <p className={s.dica}>{resumoConfiguracoes(config)}</p>
      <button
        type="button"
        className={s.botaoConfig}
        aria-label="Configurações"
        title="Configurações (M)"
        onClick={(e) => { e.currentTarget.blur(); onAbrirMenu(); }}
      >
        ⚙
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

export function MenuConfiguracoes({ config, itemDestacado, onDefinir, onFechar }: {
  config: Configuracoes;
  itemDestacado: number;
  onDefinir: (c: Configuracoes) => void;
  onFechar: () => void;
}) {
  return (
    <div className={s.painel} role="dialog" aria-modal="true" aria-label="Configurações">
      <div className={s.menu}>
        <div className={s.cabecalhoMenu}>
          <h2>Configurações</h2>
          <button type="button" aria-label="Fechar" onClick={onFechar}>✕</button>
        </div>
        <ul>
          {ITENS_CONFIG.map((item, i) => (
            <li key={item} className={i === itemDestacado ? s.destacado : undefined}>
              <p className={s.rotuloItem} id={`cfg-${item}`}>{ROTULO_ITEM[item]}</p>
              <div className={s.opcoes} role="group" aria-labelledby={`cfg-${item}`}>
                {(OPCOES[item] as readonly Configuracoes[typeof item][]).map((valor) => {
                  const ativo = config[item] === valor;
                  return (
                    <button
                      key={String(valor)}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => onDefinir({ ...config, [item]: valor } as Configuracoes)}
                    >
                      {`${ativo ? '◉' : '○'} ${rotuloValor(item, valor)}`}
                    </button>
                  );
                })}
              </div>
              {item === 'modo' && <p className={s.dica}>{DICA_GESTOS[config.modo]}</p>}
            </li>
          ))}
        </ul>
        <p className={s.dica}>↑/↓ escolhem o item · ←/→ mudam o valor · Esc ou Enter fecham</p>
      </div>
    </div>
  );
}

export function BotaoSair({ onSair }: { onSair: () => void }) {
  return (
    <button type="button" className={s.sair} aria-label="Sair da partida" onClick={(e) => { e.currentTarget.blur(); onSair(); }}>
      ✕ Sair
    </button>
  );
}

/** Tempo restante do card (AC-4.6); vermelha nos últimos 5 s (AC-4.7). */
export function BarraTempo({ restanteMs, totalMs, alerta }: { restanteMs: number; totalMs: number; alerta: boolean }) {
  const fracao = Math.max(0, Math.min(1, restanteMs / totalMs));
  return (
    <div className={alerta ? `${s.barraTempo} ${s.barraAlerta}` : s.barraTempo} role="timer" aria-label="Tempo restante">
      <div className={s.barraPreenchida} style={{ width: `${fracao * 100}%` }} />
      <span className={s.barraSegundos}>{`${Math.ceil(restanteMs / 1000)} s`}</span>
    </div>
  );
}

export function TelaCard({ noticia, restanteMs, saibaMais, ausente, saida, pontos, modo = 'corpo', totalMs = 15000, cardRef, onArrastar }: {
  noticia: Noticia;
  restanteMs: number;
  /** Duração do card, para a fração da barra de tempo (AC-4.6). */
  totalMs?: number;
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
  const alerta = !saida && restanteMs <= 5000;
  const pulsando = alerta && !ausente; // AC-4.7: só "Volte para o centro" pausa o cronômetro (v5.0.0)
  return (
    <main className={s.mesa}>
      <div className={s.lado}>✗ Falsa</div>
      <article
        ref={cardRef}
        className={[s.card, saida && (saida === 'direita' ? s.saiDireita : s.saiEsquerda), pulsando && s.pulsando].filter(Boolean).join(' ')}
        onPointerDown={(e) => { inicioX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (inicioX.current === null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if (dx > 100) onArrastar('direita');
          else if (dx < -100) onArrastar('esquerda');
        }}
      >
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
      {!saida && <BarraTempo restanteMs={restanteMs} totalMs={totalMs} alerta={alerta} />}
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

/** `foto`: quadro da câmera do meio da partida (FR-13); sem ela, o resumo fica como em AC-5.1 (AC-13.3). */
export function TelaResumo({ pontos, total, tecnicas, foto }: { pontos: number; total: number; tecnicas: Tecnica[]; foto?: string | null }) {
  const texto = (
    <>
      <h1>Fim de jogo!</h1>
      <p className={s.placar}>{`${pontos} de ${total}`}</p>
      <p className={s.mensagemResumo}>{mensagemResumo(pontos, total)}</p>
      <h2>Técnicas que você praticou</h2>
      <ul className={s.tecnicas}>{tecnicas.map((t) => <li key={t}>{TECNICA_ROTULO[t]}</li>)}</ul>
    </>
  );
  return (
    <main className={s.centro}>
      {foto ? (
        <div className={s.resumoFoto}>
          <figure className={s.polaroid}>
            <img src={foto} alt="Sua foto na partida" />
            <figcaption>{`Match do Saber · ${pontos} de ${total}`}</figcaption>
          </figure>
          <div className={s.resumoTexto}>{texto}</div>
        </div>
      ) : texto}
      <p className={s.dica}>Operador: Enter para a próxima partida</p>
    </main>
  );
}
