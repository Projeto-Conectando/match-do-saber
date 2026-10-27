import type { Noticia } from './types';

function embaralhar<T>(itens: T[], rng: () => number): T[] {
  const a = [...itens];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function sortear(noticias: Noticia[], rng: () => number, total = 10): Noticia[] {
  const v = embaralhar(noticias.filter((x) => x.veredito === 'verdadeira'), rng);
  const f = embaralhar(noticias.filter((x) => x.veredito === 'falsa'), rng);
  const metade = Math.floor(total / 2);
  let nv = Math.min(v.length, metade);
  let nf = Math.min(f.length, total - metade);
  let falta = total - nv - nf;
  const extraV = Math.min(falta, v.length - nv);
  nv += extraV;
  falta -= extraV;
  nf += Math.min(falta, f.length - nf);
  return embaralhar([...v.slice(0, nv), ...f.slice(0, nf)], rng);
}
