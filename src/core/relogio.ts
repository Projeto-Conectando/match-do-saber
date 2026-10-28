/** Teto do dt de um quadro: protege contra aba oculta ou notebook em repouso, sem engolir quadros lentos da detecção. */
export const DT_MAX_MS = 1000;

export function dtDoQuadro(agoraMs: number, anteriorMs: number): number {
  return Math.max(0, Math.min(agoraMs - anteriorMs, DT_MAX_MS));
}
