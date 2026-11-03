/** Card do meio da partida (⌈M/2⌉, base 0): a foto do resumo é tirada na escolha dele (AC-13.1). */
export function indiceFoto(total: number): number {
  return Math.ceil(total / 2) - 1;
}
