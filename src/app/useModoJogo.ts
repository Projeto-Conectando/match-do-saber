import { useCallback, useEffect, useMemo, useState } from 'react';
import { MODOS, lerModo, salvarModo, type Armazenamento, type ModoJogo } from '../core/modos';

function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Modo de jogo do estande (FR-9). `podeAbrir` diz se o jogo está na tela de espera. */
export function useModoJogo(podeAbrir: () => boolean) {
  const armazenamento = useMemo(armazenamentoDoNavegador, []);
  const [modo, setModo] = useState<ModoJogo>(() => lerModo(armazenamento));
  const [menu, setMenu] = useState({ aberto: false, destacado: 0 });

  const fechar = useCallback(() => setMenu({ aberto: false, destacado: 0 }), []);
  const abrir = useCallback(() => {
    if (podeAbrir()) setMenu({ aberto: true, destacado: MODOS.indexOf(modo) });
  }, [podeAbrir, modo]);
  const escolher = useCallback((m: ModoJogo) => {
    setModo(m);
    salvarModo(armazenamento, m);
    setMenu({ aberto: false, destacado: 0 });
  }, [armazenamento]);

  // Captura no window: com o menu aberto, nenhuma tecla chega ao jogo (Enter não inicia partida).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const m = e.key === 'm' || e.key === 'M';
      if (!menu.aberto) {
        if (m && podeAbrir()) { e.preventDefault(); abrir(); }
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (m || e.key === 'Escape') fechar();
      else if (e.key === 'ArrowDown') setMenu((s) => ({ ...s, destacado: (s.destacado + 1) % MODOS.length }));
      else if (e.key === 'ArrowUp') setMenu((s) => ({ ...s, destacado: (s.destacado + MODOS.length - 1) % MODOS.length }));
      else if (e.key === 'Enter') escolher(MODOS[menu.destacado]!);
    };
    window.addEventListener('keydown', tecla, { capture: true });
    return () => window.removeEventListener('keydown', tecla, { capture: true });
  }, [menu, podeAbrir, abrir, fechar, escolher]);

  return { modo, menuAberto: menu.aberto, destacado: menu.destacado, abrir, fechar, escolher };
}
