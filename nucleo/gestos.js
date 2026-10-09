// Control por gestos con la cámara (MediaPipe Hands, todo local y sin internet).
// El wasm y el modelo van incrustados (comprimidos con gzip) y se descomprimen en el navegador.
//
// const g = await iniciarGestos({ video, espejo, contextos: ['vista'], alEvento: (nombre, datos) => … });
// g.activar(['tiempo'])   // cambia los gestos de contexto (los "base" siempre están)
// g.detener()
// Eventos: ver CATALOGO en gestos-clasificador.js (mover, pausa, navegar, confirmar, alternar,
// apuntar, perilla, aplauso, zoom, volante) + 'pose' y 'manos' (n.º de manos visibles).
import { HandLandmarker } from '@mediapipe/tasks-vision';
import wasmGz from '@recursos/ia/vision_wasm_internal.wasm.gz';
import modeloGz from '@recursos/ia/hand_landmarker.task.gz';
import cargadorJs from '@recursos/ia/vision_wasm_internal.js.txt';
import { MotorGestos, CATALOGO } from './gestos-clasificador.js';

export { CATALOGO };

async function descomprimir(dataUrl) {
  const r = await fetch(dataUrl);
  return new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

let detectorCompartido = null;
export async function cargarDetector({ alProgreso = () => {} } = {}) {
  if (detectorCompartido) return detectorCompartido;
  alProgreso('Preparando el detector de manos…');
  const [wasm, modelo] = await Promise.all([descomprimir(wasmGz), descomprimir(modeloGz)]);
  const fileset = {
    wasmLoaderPath: URL.createObjectURL(new Blob([cargadorJs], { type: 'text/javascript' })),
    wasmBinaryPath: URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' })),
  };
  const opciones = (delegate) => ({
    baseOptions: { modelAssetBuffer: modelo, delegate },
    runningMode: 'VIDEO', numHands: 2,
    minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  try { detectorCompartido = await HandLandmarker.createFromOptions(fileset, opciones('GPU')); }
  catch { detectorCompartido = await HandLandmarker.createFromOptions(fileset, opciones('CPU')); }
  alProgreso('');
  return detectorCompartido;
}

const NOMBRES_POSE = { abierta: '✋ mano abierta', puno: '✊ puño', senalar: '☝️ señalar', v: '✌️ V', pellizco: '🤏 pellizco', 'pulgar-arriba': '👍 pulgar arriba', 'pulgar-der': '👉 pulgar a la derecha', 'pulgar-izq': '👈 pulgar a la izquierda' };
const HUESOS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

// Ventanita con la imagen de la cámara, la mano dibujada encima y la "chuleta" de gestos activos.
function crearInterfaz({ video, espejo }) {
  const caja = document.createElement('section');
  caja.className = 'gestos';
  caja.innerHTML = `
    <div class="gestos__vista"><canvas width="320" height="180"></canvas><p class="gestos__estado">Buscando tu mano…</p></div>
    <ul class="gestos__chuleta" aria-label="Gestos disponibles"></ul>`;
  document.body.appendChild(caja);
  const lienzo = caja.querySelector('canvas');
  const ctx = lienzo.getContext('2d');
  const estado = caja.querySelector('.gestos__estado');
  const lista = caja.querySelector('.gestos__chuleta');
  const colorMano = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#4af';
  return {
    caja,
    dibujar(manos, poses, stats) {
      const w = lienzo.width; const h = lienzo.height;
      ctx.save();
      if (espejo) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, w, h);
      manos.forEach((p) => {
        // los puntos ya vienen espejados por el motor si corresponde
        ctx.strokeStyle = colorMano; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (const [a, b] of HUESOS) { ctx.beginPath(); ctx.moveTo(p[a].x * w, p[a].y * h); ctx.lineTo(p[b].x * w, p[b].y * h); ctx.stroke(); }
        ctx.fillStyle = '#fff';
        for (const q of p) { ctx.beginPath(); ctx.arc(q.x * w, q.y * h, 2.6, 0, Math.PI * 2); ctx.fill(); }
      });
      const tiempo = stats?.latenciaMs ? ` · ${Math.round(stats.latenciaMs)} ms` : ''; // latencia del detector (meta < 100 ms)
      estado.textContent = (manos.length ? (poses.filter(Boolean).map((q) => NOMBRES_POSE[q] ?? q).join(' + ') || 'mano detectada') : 'Buscando tu mano…') + tiempo;
    },
    chuleta(nombres) {
      lista.innerHTML = nombres.map((n) => `<li data-g="${n}"><span>${CATALOGO[n].icono}</span>${CATALOGO[n].texto}</li>`).join('');
    },
    resaltar(nombre) {
      const li = lista.querySelector(`[data-g="${nombre}"]`);
      if (!li) return;
      li.classList.remove('activo'); void li.offsetWidth; li.classList.add('activo');
    },
    quitar() { caja.remove(); },
  };
}

export async function iniciarGestos({ video, espejo = true, contextos = [], alEvento = () => {}, alProgreso, conInterfaz = true }) {
  const ui = conInterfaz ? crearInterfaz({ video, espejo }) : null;
  const motor = new MotorGestos({
    espejo,
    alEvento: (n, d) => { if (CATALOGO[n]) ui?.resaltar(n); alEvento(n, d); },
  });
  motor.activar(contextos);
  ui?.chuleta(motor.gestosActivos());
  const detector = await cargarDetector({ alProgreso });
  let corriendo = true;
  let simulado = false; // las pruebas inyectan manos: la cámara deja de alimentar al motor
  let ultimoTiempo = -1;
  let manosAntes = -1;
  const stats = { latenciaMs: 0, fps: 0 };
  let cuadros = 0; let desde = performance.now();

  const bucle = () => {
    if (!corriendo) return;
    if (!simulado && video.readyState >= 2 && video.currentTime !== ultimoTiempo) {
      ultimoTiempo = video.currentTime;
      const t0 = performance.now();
      const r = detector.detectForVideo(video, t0);
      stats.latenciaMs = 0.8 * stats.latenciaMs + 0.2 * (performance.now() - t0);
      const manos = (r.landmarks ?? []).slice(0, 2);
      motor.procesar(manos, t0 / 1000);
      if (manos.length !== manosAntes) { manosAntes = manos.length; alEvento('manos', { n: manos.length }); }
      ui?.dibujar(motor.ultimas?.manos ?? [], motor.ultimas?.poses ?? [], stats);
      cuadros++;
      if (t0 - desde > 1000) { stats.fps = Math.round((cuadros * 1000) / (t0 - desde)); cuadros = 0; desde = t0; }
    }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);

  const api = {
    motor, stats,
    activar(ctx) { motor.activar(ctx); ui?.chuleta(motor.gestosActivos()); },
    // Para pruebas: inyecta manos (puntos sin espejar) como si vinieran de la cámara (y pausa la cámara real).
    inyectar(manos, t = performance.now() / 1000) {
      simulado = true; motor.procesar(manos, t);
      ui?.dibujar(motor.ultimas?.manos ?? [], motor.ultimas?.poses ?? [], stats);
    },
    detener() { corriendo = false; ui?.quitar(); },
  };
  (window.__modelo ??= {}).gestos = api;
  return api;
}
