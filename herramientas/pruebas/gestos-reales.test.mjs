// Prueba con MANOS REALES: fotos de prueba de MediaPipe (recursos/pruebas-manos/) pasadas como cámara falsa a
// Chromium, con el detector incrustado del modelo y el clasificador del núcleo. Recorre el camino completo:
// cámara → MediaPipe → clasificador → evento → acción del modelo.
// Uso: node herramientas/pruebas/gestos-reales.test.mjs [carpeta-del-modelo]   (necesita ffmpeg)
import { chromium } from 'playwright';
import { existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const carpeta = path.resolve(RAIZ, process.argv[2] ?? 'modelos/astronomia/fases-luna');
const FOTOS = path.join(RAIZ, 'recursos/pruebas-manos');
const CHROMIUM = '/opt/pw-browsers/chromium';

let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fallos++; };
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { console.log('– sin ffmpeg: se omite la prueba con manos reales'); process.exit(0); }

// foto → pose esperada (y gestos que NO deben aparecer)
const CASOS = [
  { foto: 'fist', espera: 'puno' },
  { foto: 'victory', espera: 'v' },
  { foto: 'thumb_up', espera: 'pulgar-arriba', paso: 2, accion: 'confirma el "Predice y verifica"' },
  { foto: 'pointing_up', espera: 'senalar' },
  { foto: 'right_hands', espera: 'abierta' },
];
const tmp = mkdtempSync(path.join(tmpdir(), 'manos-'));

for (const caso of CASOS) {
  // 1 s de video 640×480 a 30 fps con la foto centrada (Chromium repite el archivo en bucle)
  const y4m = path.join(tmp, `${caso.foto}.y4m`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', path.join(FOTOS, `${caso.foto}.jpg`), '-t', '1', '-r', '30',
    '-vf', 'scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:color=0xd8d4cc', '-pix_fmt', 'yuv420p', y4m]);
  const nav = await chromium.launch({
    ...(existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {}),
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`],
  });
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['camera'] });
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  await p.route(/^https?:\/\//, (r) => r.abort());
  await p.goto('file://' + path.join(carpeta, 'index.html'));
  await p.waitForFunction(() => window.__modelo?.recorrido);
  await p.click('[data-usar-gestos]'); await p.click('[data-r="camara"]');
  await p.waitForFunction(() => window.__modelo?.gestos?.motor, null, { timeout: 120000 });
  if (caso.paso != null) { await p.evaluate((k) => window.__modelo.recorrido.ir(k), caso.paso); await p.waitForTimeout(2600); }
  // Muestrear las poses que ve el clasificador durante unos segundos
  const vistas = await p.evaluate(async () => {
    const cuenta = {}; const fin = performance.now() + 9000;
    while (performance.now() < fin) {
      for (const pose of window.__modelo.gestos.motor.ultimas?.poses ?? []) cuenta[pose ?? 'ninguna'] = (cuenta[pose ?? 'ninguna'] ?? 0) + 1;
      await new Promise((r) => setTimeout(r, 100));
    }
    return cuenta;
  });
  const total = Object.values(vistas).reduce((a, b) => a + b, 0);
  const aciertos = vistas[caso.espera] ?? 0;
  const latencia = await p.evaluate(() => window.__modelo.gestos.stats.latenciaMs);
  ok(total > 0 && aciertos / total >= 0.8, `${caso.foto}.jpg → "${caso.espera}" en ${total ? Math.round((100 * aciertos) / total) : 0} % de las muestras ${JSON.stringify(vistas)} · latencia ${latencia.toFixed(0)} ms`);
  if (caso.accion) ok(await p.$eval('[data-prediccion]', (n) => !!n.querySelector('.elegida')), `${caso.foto}.jpg: la mano real ${caso.accion}`);
  ok(errores.length === 0, `${caso.foto}.jpg: sin errores${errores.length ? `: ${errores[0]}` : ''}`);
  await nav.close();
}
console.log('  (latencias en la nube, sin GPU: solo de referencia; en un portátil con GPU se espera < 100 ms)');
console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
