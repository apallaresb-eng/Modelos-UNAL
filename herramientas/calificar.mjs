// Capturas y métricas estándar para que el agente `evaluador-calidad` califique un modelo
// con la rúbrica 9/10 (skill estandar-calidad). Todo sin internet.
// Uso: node herramientas/calificar.mjs <carpeta-del-modelo>
// Salida: pruebas/<modelo>/calificacion/*.png + calificacion.json
import { chromium } from 'playwright';
import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROMIUM_NUBE = '/opt/pw-browsers/chromium';
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

const carpeta = path.resolve(process.argv[2] ?? '');
const index = path.join(carpeta, 'index.html');
if (!process.argv[2] || !existsSync(index)) { console.error('Uso: npm run calificar -- modelos/<materia>/<tema>  (debe existir index.html)'); process.exit(1); }
const nombre = path.relative(RAIZ, carpeta).replaceAll(path.sep, '__');
const salida = path.join(RAIZ, 'pruebas', nombre, 'calificacion');
mkdirSync(salida, { recursive: true });

const navegador = await chromium.launch({
  executablePath: existsSync(CHROMIUM_NUBE) ? CHROMIUM_NUBE : undefined,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
});

// Porcentaje de la pantalla tapado por interfaz: muestrea una rejilla con elementFromPoint.
// (elementFromPoint ignora pointer-events:none, así que se reactiva un momento para que el título cuente).
const coberturaUI = (pagina) => pagina.evaluate(() => {
  const estilo = document.createElement('style');
  estilo.textContent = '*:not(canvas){pointer-events:auto!important}';
  document.head.appendChild(estilo);
  let tapados = 0; let total = 0;
  for (let y = 0.5; y < 36; y++) for (let x = 0.5; x < 64; x++) {
    total++;
    const el = document.elementFromPoint((x / 64) * innerWidth, (y / 36) * innerHeight);
    if (!el || el === document.body || el === document.documentElement || el.tagName === 'CANVAS') continue;
    let o = el; let visible = true;
    while (o && o !== document.body) { if (Number(getComputedStyle(o).opacity) < 0.05) { visible = false; break; } o = o.parentElement; }
    if (visible) tapados++;
  }
  estilo.remove();
  return Math.round((tapados / total) * 100);
});
// Palabras visibles en pantalla (texto de elementos visibles, sin contar la barra de herramientas).
const palabrasVisibles = (pagina) => pagina.evaluate(() => {
  const textos = [];
  const recorrer = (n) => {
    for (const h of n.childNodes) {
      if (h.nodeType === 3) {
        const p = h.parentElement;
        if (!p || p.closest('.barra-herramientas, script, style, .katex-mathml')) continue;
        const r = p.getBoundingClientRect(); const s = getComputedStyle(p);
        if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && Number(s.opacity) > 0.05 && !p.closest('[hidden]')) {
          let o = p; let visible = true;
          while (o) { if (Number(getComputedStyle(o).opacity) < 0.05) { visible = false; break; } o = o.parentElement; }
          if (visible) textos.push(h.textContent);
        }
      } else if (h.nodeType === 1) recorrer(h);
    }
  };
  recorrer(document.body);
  return textos.join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
});
const medirFps = (pagina, ms = 1500) => pagina.evaluate((ms) => new Promise((ok) => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++; performance.now() - t0 < ms ? requestAnimationFrame(f) : ok(Math.round((n * 1000) / ms)); };
  requestAnimationFrame(f);
}), ms);

async function abrir(viewport, { proyector = false } = {}) {
  const pagina = await navegador.newPage({ viewport });
  const errores = []; const red = [];
  pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  pagina.on('pageerror', (e) => errores.push(e.message));
  await pagina.route(/^https?:\/\//, (r) => { red.push(r.request().url()); r.abort(); });
  await pagina.goto(pathToFileURL(index).href);
  if (proyector) await pagina.addStyleTag({ content: 'html{filter:contrast(.72) brightness(1.12) saturate(.8)}' });
  return { pagina, errores, red };
}
const foto = (pagina, n) => pagina.screenshot({ path: path.join(salida, `${n}.png`) });

const informe = { modelo: path.relative(RAIZ, carpeta), fecha: new Date().toISOString(), capturas: [], pasos: [], metricas: {}, errores: [], intentosRed: [] };

// 1. Primeros segundos (sin tocar nada), recorrido y modos, a 1920×1080
{
  const { pagina, errores, red } = await abrir({ width: 1920, height: 1080 });
  await esperar(1000); await foto(pagina, '01-primer-segundo');
  await esperar(4000); await foto(pagina, '02-cinco-segundos');
  informe.metricas.palabrasAlInicio = await palabrasVisibles(pagina);
  const hayRecorrido = await pagina.evaluate(() => !!window.__modelo?.recorrido);
  informe.metricas.tieneRecorrido = hayRecorrido;
  if (hayRecorrido) {
    await pagina.keyboard.press('Escape'); // salta la intro si sigue
    const total = await pagina.evaluate(() => window.__modelo.recorrido.total);
    for (let i = 0; i < total; i++) {
      await pagina.evaluate((i) => window.__modelo.recorrido.ir(i), i);
      await esperar(2200);
      const n = `03-paso-${i + 1}`;
      await foto(pagina, n);
      const texto = await pagina.evaluate(() => document.querySelector('.recorrido__texto')?.innerText ?? '');
      informe.pasos.push({ paso: i + 1, captura: `${n}.png`, palabrasDelPaso: texto.split(/\s+/).filter(Boolean).length, palabrasEnPantalla: await palabrasVisibles(pagina), coberturaUI: await coberturaUI(pagina) });
    }
    await pagina.evaluate(() => window.__modelo.recorrido.modoLibre());
    await esperar(1200);
  }
  await foto(pagina, '04-modo-libre');
  informe.metricas.coberturaUIModoLibre = await coberturaUI(pagina);
  await pagina.evaluate(() => window.__modelo?.activarModoExpo?.(true));
  await esperar(800);
  await foto(pagina, '05-modo-expo');
  informe.metricas.coberturaUIModoExpo = await coberturaUI(pagina);
  informe.metricas.tieneModoExpo = await pagina.evaluate(() => typeof window.__modelo?.activarModoExpo === 'function');
  await pagina.evaluate(() => window.__modelo?.activarModoExpo?.(false));
  informe.metricas.fpsAuto = await medirFps(pagina);
  await pagina.evaluate(() => window.__modelo?.calidad?.forzarAlta(true));
  await esperar(1200);
  informe.metricas.fpsAlta = await medirFps(pagina);
  await foto(pagina, '06-calidad-alta');
  informe.errores.push(...errores); informe.intentosRed.push(...red);
  await pagina.close();
}
// 2. Portátil básico, proyector y celular
for (const [n, vp, op] of [['07-portatil-1366', { width: 1366, height: 768 }, {}], ['08-proyector', { width: 1920, height: 1080 }, { proyector: true }], ['09-celular', { width: 390, height: 844 }, {}]]) {
  const { pagina, errores, red } = await abrir(vp, op);
  await esperar(1500);
  await pagina.keyboard.press('Escape');
  await esperar(2500);
  await foto(pagina, n);
  informe.errores.push(...errores); informe.intentosRed.push(...red);
  await pagina.close();
}
await navegador.close();

informe.metricas.pesoKB = Math.round(statSync(index).size / 1024);
informe.metricas.maxPalabrasPorPaso = Math.max(0, ...informe.pasos.map((p) => p.palabrasDelPaso));
informe.metricas.coberturaUIMaxEnPasos = Math.max(0, ...informe.pasos.map((p) => p.coberturaUI));
informe.capturas = ['01-primer-segundo', '02-cinco-segundos', ...informe.pasos.map((p) => p.captura.replace('.png', '')), '04-modo-libre', '05-modo-expo', '06-calidad-alta', '07-portatil-1366', '08-proyector', '09-celular'].map((c) => `${c}.png`);
informe.errores = [...new Set(informe.errores)];
informe.intentosRed = [...new Set(informe.intentosRed)];

// Chequeos automáticos de la rúbrica (el resto lo califica el agente mirando las capturas)
const m = informe.metricas;
informe.chequeos = {
  'recorrido de 3–7 pasos': m.tieneRecorrido && informe.pasos.length >= 3 && informe.pasos.length <= 7,
  '≤ 25 palabras por paso': m.maxPalabrasPorPaso <= 25,
  '≤ 40 palabras en pantalla al inicio': m.palabrasAlInicio <= 40,
  'interfaz ≤ 25 % en modo expo': m.coberturaUIModoExpo <= 25,
  'sin errores de consola': informe.errores.length === 0,
  'sin intentos de red': informe.intentosRed.length === 0,
  'peso ≤ 15 MB': m.pesoKB <= 15 * 1024,
};
writeFileSync(path.join(salida, 'calificacion.json'), JSON.stringify(informe, null, 2));
console.log(`Capturas y métricas en ${path.relative(RAIZ, salida)}/`);
for (const [c, ok] of Object.entries(informe.chequeos)) console.log(`${ok ? '✓' : '✗'} ${c}`);
console.log(`Interfaz: modo libre ${m.coberturaUIModoLibre} % · modo expo ${m.coberturaUIModoExpo} % · máx. en pasos ${m.coberturaUIMaxEnPasos} %`);
console.log(`Palabras: al inicio ${m.palabrasAlInicio} · máx. por paso ${m.maxPalabrasPorPaso} · FPS auto/alta ${m.fpsAuto}/${m.fpsAlta} (sin GPU en la nube)`);
// Si existe una calificación previa del evaluador, la recuerda.
const previa = path.join(carpeta, 'calificacion.md');
if (existsSync(previa)) console.log(`Calificación anterior: ${(readFileSync(previa, 'utf8').match(/Veredicto:.*$/m) ?? ['(sin veredicto)'])[0]}`);
