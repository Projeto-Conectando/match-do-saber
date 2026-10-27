import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const MODELO_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
const existe = (p: string) => stat(p).then(() => true, () => false);

await mkdir('public/mediapipe', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/mediapipe/wasm', { recursive: true });

const modelo = 'public/mediapipe/pose_landmarker_lite.task';
if (!(await existe(modelo))) {
  const r = await fetch(MODELO_URL);
  if (!r.ok) throw new Error(`falha ao baixar modelo: ${r.status}`);
  await writeFile(modelo, Buffer.from(await r.arrayBuffer()));
}

for (const tam of [192, 512]) {
  await sharp('public/icons/icon.svg').resize(tam, tam).png().toFile(`public/icons/icon-${tam}.png`);
}
console.log('assets prontos');
