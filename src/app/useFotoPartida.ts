import { useEffect, useRef, useState } from 'react';
import { indiceFoto } from '../core/foto';
import type { Estado } from '../core/partida';

/**
 * Foto do resumo (FR-13): um quadro tirado no feedback do card do meio (AC-13.1), guardado só em
 * estado React e apagado na espera, na calibração e no card 0 de uma nova partida (AC-13.4).
 */
export function useFotoPartida(estado: Estado, ligada: boolean, capturar: () => string | null): string | null {
  const [foto, setFoto] = useState<string | null>(null);
  const capturarRef = useRef(capturar);
  capturarRef.current = capturar;
  const indice = 'indice' in estado ? estado.indice : -1;
  // Reage só à troca de tela/card, não a cada tick do mesmo estado.
  useEffect(() => {
    if (estado.tela === 'espera' || estado.tela === 'calibracao' || (estado.tela === 'card' && estado.indice === 0)) setFoto(null);
    else if (estado.tela === 'feedback' && ligada && estado.indice === indiceFoto(estado.partida.cards.length)) setFoto(capturarRef.current());
  }, [estado.tela, indice]);
  return foto;
}
