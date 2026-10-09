// Prepara los archivos de IA (MediaPipe) comprimidos con gzip en recursos/ia/ para incrustarlos.
// Comprimidos pesan ~9 MB en vez de ~21 MB; el navegador los descomprime al vuelo (DecompressionStream).
// Uso: node herramientas/preparar-ia.mjs   (se corre una vez; el resultado va al repo)
import { createReadStream, createWriteStream, existsSync, copyFileSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip, constants } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IA = path.join(RAIZ, 'recursos/ia');
const WASM = path.join(RAIZ, 'node_modules/@mediapipe/tasks-vision/wasm');
const MODELO_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function gzip(origen, destino) {
  await pipeline(createReadStream(origen), createGzip({ level: constants.Z_BEST_COMPRESSION }), createWriteStream(destino));
  console.log(`✓ ${path.basename(destino)} (${(statSync(destino).size / 1048576).toFixed(1)} MB)`);
}

const modelo = path.join(IA, 'hand_landmarker.task');
if (!existsSync(modelo)) {
  const r = await fetch(MODELO_URL);
  if (!r.ok) throw new Error(`No se pudo descargar el modelo de manos: ${r.status}`);
  await pipeline(r.body, createWriteStream(modelo));
}
await gzip(modelo, `${modelo}.gz`);
await gzip(path.join(WASM, 'vision_wasm_internal.wasm'), path.join(IA, 'vision_wasm_internal.wasm.gz'));
copyFileSync(path.join(WASM, 'vision_wasm_internal.js'), path.join(IA, 'vision_wasm_internal.js.txt'));
console.log('✓ vision_wasm_internal.js.txt (cargador)');
