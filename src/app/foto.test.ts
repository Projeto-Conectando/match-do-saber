// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturarQuadro } from './foto';

function video(w: number, h: number) {
  const v = document.createElement('video');
  Object.defineProperty(v, 'videoWidth', { value: w });
  Object.defineProperty(v, 'videoHeight', { value: h });
  return v;
}

function contextoFalso() {
  const chamadas: string[] = [];
  const g = {
    translate: vi.fn((x: number, y: number) => chamadas.push(`translate(${x}, ${y})`)),
    scale: vi.fn((x: number, y: number) => chamadas.push(`scale(${x}, ${y})`)),
    drawImage: vi.fn(() => chamadas.push('drawImage')),
  };
  return { g, chamadas };
}

afterEach(() => vi.restoreAllMocks());

describe('capturarQuadro (FR-13)', () => {
  it('vídeo sem dimensões devolve null', () => {
    expect(capturarQuadro(video(0, 0))).toBeNull();
  });

  it('AC-13.2: quadro 480×270, espelhado como a prévia, em JPEG', () => {
    const { g, chamadas } = contextoFalso();
    let canvas: HTMLCanvasElement | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      canvas = this;
      return g as unknown as CanvasRenderingContext2D;
    });
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    const v = video(1280, 720);

    expect(capturarQuadro(v)).toBe('data:image/jpeg;base64,AAA');
    expect(canvas).not.toBeNull();
    expect(canvas!.width).toBe(480);
    expect(canvas!.height).toBe(270);
    expect(chamadas).toEqual(['translate(480, 0)', 'scale(-1, 1)', 'drawImage']);
    expect(g.drawImage).toHaveBeenCalledWith(v, 0, 0, 480, 270);
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85);
  });

  it('AC-13.3: drawImage que lança erro devolve null', () => {
    const { g } = contextoFalso();
    g.drawImage.mockImplementation(() => { throw new Error('falhou'); });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(g as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    expect(capturarQuadro(video(1280, 720))).toBeNull();
  });
});
