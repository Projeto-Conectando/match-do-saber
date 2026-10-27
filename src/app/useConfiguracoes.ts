import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ITENS_CONFIG, lerConfiguracoes, mudarValor, salvarConfiguracoes, type Armazenamento, type Configuracoes,
} from '../core/modos';

function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Configurações do estande (FR-9). `podeAbrir` diz se o jogo está na tela de espera. */
export function useConfiguracoes(podeAbrir: () => boolean) {
  const armazenamento = useMemo(armazenamentoDoNavegador, []);
  const [config, setConfig] = useState<Configuracoes>(() => lerConfiguracoes(armazenamento));
  const [menu, setMenu] = useState({ aberto: false, item: 0 });

  const fechar = useCallback(() => setMenu({ aberto: false, item: 0 }), []);
  const abrir = useCallback(() => {
    if (podeAbrir()) setMenu({ aberto: true, item: 0 });
  }, [podeAbrir]);
  const definir = useCallback((c: Configuracoes) => {
    setConfig(c);
    salvarConfiguracoes(armazenamento, c);
  }, [armazenamento]);

  // Captura no window: com o menu aberto, nenhuma tecla chega ao jogo (Enter não inicia, Esc não "sai").
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const m = e.key === 'm' || e.key === 'M';
      if (!menu.aberto) {
        if (m && podeAbrir()) { e.preventDefault(); abrir(); }
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      const n = ITENS_CONFIG.length;
      const item = ITENS_CONFIG[menu.item]!;
      if (m || e.key === 'Escape' || e.key === 'Enter') fechar();
      else if (e.key === 'ArrowDown') setMenu((s) => ({ ...s, item: (s.item + 1) % n }));
      else if (e.key === 'ArrowUp') setMenu((s) => ({ ...s, item: (s.item + n - 1) % n }));
      else if (e.key === 'ArrowLeft') definir(mudarValor(config, item, -1));
      else if (e.key === 'ArrowRight') definir(mudarValor(config, item, 1));
    };
    window.addEventListener('keydown', tecla, { capture: true });
    return () => window.removeEventListener('keydown', tecla, { capture: true });
  }, [menu, config, podeAbrir, abrir, fechar, definir]);

  return { config, menuAberto: menu.aberto, itemDestacado: menu.item, abrir, fechar, definir };
}
