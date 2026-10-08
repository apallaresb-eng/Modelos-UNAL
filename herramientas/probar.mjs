// Abre cada index.html en Chromium SIN internet, revisa errores de consola, mide FPS
// y guarda capturas en calidad automática y en "Calidad alta" dentro de pruebas/.
// Uso: node herramientas/probar.mjs [carpeta-del-modelo ...]
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buscarModelos } from './comun.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// En la nube de Claude Chromium está preinstalado aquí; en tu PC Playwright usa el suyo.
const CHROMIUM_NUBE = '/opt/pw-browsers/chromium';

async function medirFps(pagina, ms = 2000) {
  return pagina.evaluate((ms) => new Promise((ok) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; performance.now() - t0 < ms ? requestAnimationFrame(f) : ok(Math.round((n * 1000) / ms)); };
    requestAnimationFrame(f);
  }), ms);
}

export async function probar(carpeta, navegador) {
  const dir = path.resolve(carpeta);
  const index = path.join(dir, 'index.html');
  if (!existsSync(index)) return { dir, errores: ['Falta index.html (corre npm run empaquetar)'] };

  const salida = path.join(RAIZ, 'pruebas', path.relative(RAIZ, dir).replaceAll(path.sep, '__'));
  mkdirSync(salida, { recursive: true });
  const pagina = await navegador.newPage({ viewport: { width: 1600, height: 900 } });
  const errores = [];
  const intentosRed = [];
  pagina.on('console', (m) => m.type() === 'error' && errores.push(`consola: ${m.text()}`));
  pagina.on('pageerror', (e) => errores.push(`excepción: ${e.message}`));
  // Simula el salón sin internet: cualquier petición http(s) se bloquea y se reporta.
  await pagina.route(/^https?:\/\//, (r) => { intentosRed.push(r.request().url()); r.abort(); });

  await pagina.goto(pathToFileURL(index).href);
  await pagina.waitForTimeout(3000);
  const fpsAuto = await medirFps(pagina);
  const nivelAuto = await pagina.evaluate(() => document.documentElement.dataset.calidad ?? '(sin calidad)');
  await pagina.screenshot({ path: path.join(salida, 'calidad-auto.png') });

  const casilla = pagina.locator('[data-calidad-alta]');
  let fpsAlta = null;
  if (await casilla.count()) {
    await casilla.check();
    await pagina.waitForTimeout(1500);
    fpsAlta = await medirFps(pagina);
    await pagina.screenshot({ path: path.join(salida, 'calidad-alta.png') });
  } else errores.push('No existe la casilla "Calidad alta"');

  await pagina.close();
  intentosRed.forEach((u) => errores.push(`intentó usar internet: ${u}`));
  return { dir, errores, nivelAuto, fpsAuto, fpsAlta, capturas: path.relative(RAIZ, salida) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const carpetas = process.argv.slice(2).length ? process.argv.slice(2) : buscarModelos(RAIZ);
  const navegador = await chromium.launch({
    executablePath: existsSync(CHROMIUM_NUBE) ? CHROMIUM_NUBE : undefined,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  });
  let fallos = 0;
  for (const c of carpetas) {
    const r = await probar(c, navegador);
    fallos += r.errores.length;
    console.log(`${r.errores.length ? '✗' : '✓'} ${path.relative(RAIZ, r.dir)}  calidad=${r.nivelAuto}  fps(auto)=${r.fpsAuto}  fps(alta)=${r.fpsAlta}  capturas→ ${r.capturas}`);
    r.errores.forEach((e) => console.log(`   ${e}`));
  }
  await navegador.close();
  console.log('Nota: en la nube no hay GPU; los FPS reales en un portátil son mucho mayores.');
  process.exit(fallos ? 1 : 0);
}
