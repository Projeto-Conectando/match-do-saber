import { useEffect, useRef, type RefObject } from 'react';
import type { Pose } from '../core/gestos';
import s from './App.module.css';

const OSSOS: [number, number][] = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];

export function CameraPreview({ videoRef, poseRef, visivel }: {
  videoRef: RefObject<HTMLVideoElement>;
  poseRef: RefObject<Pose | null>;
  visivel: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const desenhar = () => {
      const c = canvas.current;
      const g = c?.getContext('2d');
      if (c && g) {
        g.clearRect(0, 0, c.width, c.height);
        const p = poseRef.current;
        if (p) {
          g.strokeStyle = '#7cff6b';
          g.lineWidth = 3;
          for (const [a, b] of OSSOS) {
            const pa = p[a], pb = p[b];
            if (!pa || !pb) continue;
            g.beginPath();
            g.moveTo(pa.x * c.width, pa.y * c.height);
            g.lineTo(pb.x * c.width, pb.y * c.height);
            g.stroke();
          }
        }
      }
      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, [poseRef]);

  return (
    <div className={s.preview} hidden={!visivel} aria-hidden>
      <video ref={videoRef} muted playsInline />
      <canvas ref={canvas} width={320} height={180} />
    </div>
  );
}
