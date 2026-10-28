import { useEffect, useState } from 'react';
import type { PontoMedido, Registro } from '../core/diagnostico';
import { MODO_ROTULO } from '../core/modos';
import s from './App.module.css';

const n2 = (v: number) => v.toFixed(2);
const linhaPunho = (rotulo: string, p: PontoMedido | undefined, acima: boolean | undefined) =>
  p ? `${rotulo}: y=${n2(p.y)} conf ${n2(p.conf)}${acima ? ' · acima do ombro' : ''}` : `${rotulo}: —`;

/** Painel do modo de diagnóstico (FR-12, AC-12.3); atualiza a cada 500 ms. */
export function PainelDiagnostico({ registro, onBaixar }: { registro: Registro; onBaixar: () => void }) {
  const [agora, setAgora] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(performance.now()), 500);
    return () => clearInterval(id);
  }, []);
  const r = registro.resumo(agora);
  const a = registro.ultima();
  const det = r.deteccaoMediaMs === null ? 'sem câmera' : `${r.deteccaoMediaMs} ms (máx ${r.deteccaoMaxMs} ms)`;
  const od = a?.pontos.ombroD, oe = a?.pontos.ombroE;
  const cab = a?.medidas.cabeca;
  return (
    <aside className={s.diagnostico} aria-label="Diagnóstico">
      <p>{`quadros/s: ${r.fps}`}</p>
      <p>{`detecção: ${det}`}</p>
      <p>{`pessoas: ${a?.pessoas ?? 0} · modo: ${a ? MODO_ROTULO[a.modo] : '—'} · tela: ${a?.tela ?? '—'}`}</p>
      <p>{linhaPunho('punho D', a?.pontos.punhoD, a?.medidas.maos?.direita)}</p>
      <p>{linhaPunho('punho E', a?.pontos.punhoE, a?.medidas.maos?.esquerda)}</p>
      <p>{od && oe ? `ombros: y=${n2(od.y)} / ${n2(oe.y)} conf ${n2(od.conf)} / ${n2(oe.conf)}` : 'ombros: —'}</p>
      <p>{cab ? `cabeça: ${cab.rollGraus.toFixed(1)}° · queixo ${n2(cab.queixo)}` : 'cabeça: —'}</p>
      <p>{`gestos (5 s): ${r.gestosRecentes.join(', ') || '—'}`}</p>
      <button type="button" onClick={(e) => { e.currentTarget.blur(); onBaixar(); }}>Baixar registro (60 s)</button>
    </aside>
  );
}
