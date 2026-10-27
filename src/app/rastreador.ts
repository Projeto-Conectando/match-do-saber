import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Pose } from '../core/gestos';

export interface Rastreador { detectar(video: HTMLVideoElement, tMs: number): Pose[]; fechar(): void }

export async function criarRastreador(): Promise<Rastreador> {
  const base = import.meta.env.BASE_URL;
  const vision = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
  const criar = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: `${base}mediapipe/pose_landmarker_lite.task`, delegate },
      runningMode: 'VIDEO',
      numPoses: 3,
    });
  const landmarker = await criar('GPU').catch(() => criar('CPU'));
  let ultimo = -1;
  return {
    detectar(video, tMs) {
      const t = Math.max(tMs, ultimo + 1);
      ultimo = t;
      return landmarker.detectForVideo(video, t).landmarks;
    },
    fechar() {
      landmarker.close();
    },
  };
}

export async function abrirCamera(video: HTMLVideoElement, sinal?: AbortSignal): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  });
  const parar = () => stream.getTracks().forEach((t) => t.stop());
  // Efeito desmontado (ex.: StrictMode) enquanto a permissão estava pendente: não toca no <video>.
  if (sinal?.aborted) {
    parar();
    throw new DOMException('cancelado', 'AbortError');
  }
  try {
    video.srcObject = stream;
    await video.play();
  } catch (e) {
    parar();
    throw e;
  }
  return stream;
}
