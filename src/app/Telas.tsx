import { useRef, type RefObject } from 'react';
import type { Resultado } from '../core/partida';
import { TECNICA_ROTULO, type Noticia, type Tecnica } from '../core/types';
import type { StatusCamera } from './useJogo';
import s from './App.module.css';

const SELO: Record<Resultado, string> = { acerto: 'Acertou!', erro: 'Errou', tempo: 'Tempo esgotado' };
const src = (caminho: string) => `${import.meta.env.BASE_URL}${caminho}`;

export function TelaEspera({ semNoticias, camera }: { semNoticias: boolean; camera: StatusCamera }) {
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
    </main>
  );
}

export function TelaCalibracao({ progresso }: { progresso: number }) {
  return (
    <main className={s.centro}>
      <p className={s.chamada}>Fique no centro</p>
      <div className={s.barra}><div style={{ width: `${Math.round(progresso * 100)}%` }} /></div>
      <p className={s.dica}>Direita: é verdade · Esquerda: é falsa · Duas mãos para cima: saiba mais</p>
    </main>
  );
}

export function TelaCard({ noticia, restanteMs, saibaMais, ausente, cardRef, onArrastar }: {
  noticia: Noticia;
  restanteMs: number;
  saibaMais: boolean;
  ausente: boolean;
  cardRef: RefObject<HTMLElement>;
  onArrastar: (lado: 'direita' | 'esquerda') => void;
}) {
  const inicioX = useRef<number | null>(null);
  return (
    <main className={s.mesa}>
      <div className={s.lado}>✗ Falsa</div>
      <article
        ref={cardRef}
        className={s.card}
        onPointerDown={(e) => { inicioX.current = e.clientX; }}
        onPointerUp={(e) => {
          if (inicioX.current === null) return;
          const dx = e.clientX - inicioX.current;
          inicioX.current = null;
          if (dx > 100) onArrastar('direita');
          else if (dx < -100) onArrastar('esquerda');
        }}
      >
        <div className={s.cronometro}>{Math.ceil(restanteMs / 1000)}</div>
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
            <p className={s.dica}>🙌 Saiba mais: levante as duas mãos (ou ↑)</p>
          </>
        )}
      </article>
      <div className={s.lado}>Verdade ✓</div>
      {ausente && <div className={s.sobreposicao}>Volte para o centro</div>}
    </main>
  );
}

export function TelaFeedback({ noticia, resultado }: { noticia: Noticia; resultado: Resultado }) {
  return (
    <main className={s.centro}>
      <p className={`${s.selo} ${s[resultado]}`}>{SELO[resultado]}</p>
      <h2>{noticia.veredito === 'verdadeira' ? 'É verdadeira' : 'É falsa'}</h2>
      <p className={s.explicacao}>{noticia.explicacao}</p>
      <p className={s.tecnica}>{TECNICA_ROTULO[noticia.tecnica]}</p>
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
