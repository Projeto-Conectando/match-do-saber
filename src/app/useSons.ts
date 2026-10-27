import { useEffect, useMemo, useRef } from 'react';
import type { Estado } from '../core/partida';
import { sonsDaTransicao } from '../core/sons';
import { criarTocador } from './audio';

/** Toca os sons de FR-11 a cada transição de estado, se `ligado`. */
export function useSons(estado: Estado, ligado: boolean) {
  const tocador = useMemo(criarTocador, []);
  const anterior = useRef(estado);

  useEffect(() => {
    const desbloquear = () => tocador.desbloquear();
    window.addEventListener('pointerdown', desbloquear, { capture: true });
    window.addEventListener('keydown', desbloquear, { capture: true });
    return () => {
      window.removeEventListener('pointerdown', desbloquear, { capture: true });
      window.removeEventListener('keydown', desbloquear, { capture: true });
    };
  }, [tocador]);

  useEffect(() => {
    const sons = sonsDaTransicao(anterior.current, estado);
    anterior.current = estado;
    if (ligado) for (const som of sons) tocador.tocar(som);
  }, [estado, ligado, tocador]);
}
