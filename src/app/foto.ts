/** Um quadro da câmera, espelhado como a prévia (AC-13.2). Fica só na memória (FR-13). */
export function capturarQuadro(video: HTMLVideoElement, largura = 480): string | null {
  try {
    const { videoWidth: w, videoHeight: h } = video;
    if (!w || !h) return null;
    const c = document.createElement('canvas');
    c.width = largura;
    c.height = Math.round((largura * h) / w);
    const g = c.getContext('2d');
    if (!g) return null;
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}
