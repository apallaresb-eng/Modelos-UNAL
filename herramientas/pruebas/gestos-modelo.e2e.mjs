// Prueba de punta a punta de los gestos en un modelo real (por defecto, Fases de la Luna).
// Abre el index.html en Chromium sin red, con cámara falsa, acepta el permiso, carga el MediaPipe incrustado
// y luego INYECTA manos sintéticas (la cámara real se pausa) para comprobar que cada gesto, en su paso del
// recorrido, cambia lo que debe cambiar — y que fuera de su contexto no hace nada.
// Uso: node herramientas/pruebas/gestos-modelo.e2e.mjs [carpeta-del-modelo]
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const carpeta = path.resolve(RAIZ, process.argv[2] ?? 'modelos/astronomia/fases-luna');
const CHROMIUM = '/opt/pw-browsers/chromium';
if (!existsSync(path.join(carpeta, 'index.html'))) { console.error('Falta index.html: corre npm run empaquetar'); process.exit(1); }

let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) fallos++; };

const navegador = await chromium.launch({
  ...(existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {}),
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const contexto = await navegador.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['camera'] });
const pagina = await contexto.newPage();
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
await pagina.route(/^https?:\/\//, (r) => r.abort());
await pagina.goto('file://' + path.join(carpeta, 'index.html'));

// Generador de manos dentro de la página (el mismo de las pruebas del clasificador)
const fuente = readFileSync(path.join(RAIZ, 'herramientas/pruebas/manos-sinteticas.mjs'), 'utf8');
await pagina.addScriptTag({ type: 'module', content: `${fuente}\nwindow.__manos = { manoSintetica, POSES };` });
await pagina.waitForFunction(() => window.__manos && window.__modelo?.recorrido && window.__modelo?.estado);

// Activar gestos: botón → pantalla de permiso → "Usar mi cámara" → carga del detector
const t0 = Date.now();
await pagina.click('[data-usar-gestos]');
await pagina.click('[data-r="camara"]');
await pagina.waitForFunction(() => window.__modelo?.gestos?.inyectar, null, { timeout: 120000 });
ok(true, `detector de manos cargado sin red en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
ok(await pagina.isVisible('.indicador-camara, [data-indicador-camara], .camara-activa'), 'indicador de cámara/privacidad visible');
ok(await pagina.isVisible('.gestos__vista canvas'), 'ventanita con la imagen de la cámara y la mano dibujada');

// Ojo: las manos sintéticas están en coordenadas de la cámara CRUDA; el motor las espeja (como se ve uno en la
// ventanita). Por eso 'pulgar-izq' de la cámara cruda es el pulgar hacia la DERECHA del usuario → paso siguiente.
// Utilidades en la página: reloj propio y reproducción de poses
await pagina.evaluate(() => {
  window.__t = 1000;
  const g = () => window.__modelo.gestos;
  const { manoSintetica, POSES } = window.__manos;
  window.__una = (pose, seg, op = {}) => { for (let i = 0; i < seg * 30; i++) { window.__t += 1 / 30; g().inyectar([manoSintetica(POSES[pose], { ruido: 0.001, ...op(i) })], window.__t); } };
  window.__dos = (pa, pb, n, op) => { for (let i = 0; i < n; i++) { window.__t += 1 / 30; const [a, b] = op(i); g().inyectar([manoSintetica(POSES[pa], { ruido: 0.001, ...a }), manoSintetica(POSES[pb], { ruido: 0.001, ...b })], window.__t); } };
  window.__nada = (seg = 0.4) => { for (let i = 0; i < seg * 30; i++) { window.__t += 1 / 30; g().inyectar([], window.__t); } };
});
const una = (pose, seg, op = '() => ({})') => pagina.evaluate(([p, s, o]) => window.__una(p, s, eval(o)), [pose, seg, op]);
const dos = (pa, pb, n, op) => pagina.evaluate(([a, b, k, o]) => window.__dos(a, b, k, eval(o)), [pa, pb, n, op]);
const nada = (seg) => pagina.evaluate((s) => window.__nada(s), seg);
const leer = () => pagina.evaluate(() => {
  const { estado, recorrido, camara, controles } = window.__modelo;
  const v = camara.position.clone().sub(controles.target);
  return { E: estado.E, pausa: estado.pausa, vista: estado.vistaTierra, sombra: estado.sombra, paso: recorrido.paso, dist: v.length(), ang: Math.atan2(v.z, v.x) };
});
const chuleta = () => pagina.$$eval('.gestos__chuleta li', (l) => l.map((x) => x.dataset.g));
const esperar = (ms) => pagina.waitForTimeout(ms);
const difAng = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const irAPaso = async (n) => { await pagina.evaluate((k) => window.__modelo.recorrido.ir(k), n); await esperar(2600); };

// ---------- Paso 1: solo los gestos base ----------
await irAPaso(0);
let c = await chuleta();
ok(c.length === 3 && ['mover', 'pausa', 'navegar'].every((n) => c.includes(n)), `paso 1: la chuleta muestra solo los 3 gestos base (${c.join(', ')})`);
await pagina.evaluate(() => { window.__modelo.estado.pausa = true; });
await una('abierta', 0.6, '(i) => ({ cx: 0.25, cy: 0.5 })');
const e1 = (await leer()).E;
await una('abierta', 0.8, '(i) => ({ cx: 0.25 + i * 0.022, cy: 0.5 })');
const e2 = (await leer()).E;
ok(difAng(e1, e2) > 25, `mano abierta que se desliza mueve la Luna (E ${e1.toFixed(0)}° → ${e2.toFixed(0)}°)`);
let antes = await leer();
await nada(); await una('puno', 0.6);
ok((await leer()).pausa !== antes.pausa, 'puño: pausa / reanuda');
antes = await leer();
await nada(); await una('pellizco', 0.6);
ok((await leer()).vista === antes.vista, 'fuera de contexto: el pellizco no cambia la vista en el paso 1');
await nada();
await dos('abierta', 'abierta', 12, '(i) => { const s = Math.max(0.02, 0.3 - i * 0.03); return [{ cx: 0.5 - s }, { cx: 0.5 + s }]; }');
ok((await leer()).sombra === antes.sombra, 'fuera de contexto: el aplauso no cambia la sombra en el paso 1');
await nada(); await una('pulgar-izq', 0.7);
await esperar(300);
ok((await leer()).paso === 1, 'pulgar al lado: pasa al paso siguiente');

// ---------- Paso 2: vista y tiempo ----------
await esperar(2400);
c = await chuleta();
ok(c.length <= 5 && c.includes('alternar') && c.includes('perilla'), `paso 2: la chuleta muestra ${c.length} gestos (≤ 5), con pellizco y V`);
antes = await leer();
await nada(); await una('pellizco', 0.6);
ok((await leer()).vista !== antes.vista, 'pellizco: cambia entre la vista del espacio y la de Bogotá');
await pagina.evaluate(() => { window.__modelo.estado.pausa = true; });
antes = await leer();
await nada(); await una('v', 1.2, '(i) => ({ rot: i * 0.03 })');
const despues = await leer();
ok(difAng(antes.E, despues.E) > 15, `V girando la muñeca pasa los días (E ${antes.E.toFixed(0)}° → ${despues.E.toFixed(0)}°)`);
await nada(1); await una('pulgar-der', 0.7);
await esperar(300);
ok((await leer()).paso === 0, 'pulgar al otro lado: vuelve al paso anterior');

// ---------- Paso 3: predice y verifica ----------
await irAPaso(2);
await pagina.evaluate(() => { const { estado } = window.__modelo; estado.pausa = true; estado.E = 90; });
await nada(); await una('pulgar-arriba', 0.8);
await esperar(400);
ok(await pagina.$eval('[data-prediccion]', (n) => !!n.querySelector('.elegida')), '👍: responde el "Predice y verifica" con la posición actual de la Luna');

// ---------- Paso 4: sombra de la Tierra ----------
await irAPaso(3);
antes = await leer();
await nada(1);
await dos('abierta', 'abierta', 12, '(i) => { const s = Math.max(0.02, 0.3 - i * 0.03); return [{ cx: 0.5 - s }, { cx: 0.5 + s }]; }');
ok((await leer()).sombra !== antes.sombra, 'aplauso: muestra / oculta la sombra de la Tierra');

// ---------- Paso 5: zoom y girar con las dos manos ----------
await irAPaso(4);
await pagina.evaluate(() => { window.__modelo.controles.enableDamping = false; });
antes = await leer();
await nada();
await dos('pellizco', 'pellizco', 20, '(i) => { const s = 0.15 + i * 0.01; return [{ cx: 0.5 - s }, { cx: 0.5 + s }]; }');
let ahora = await leer();
ok(Math.abs(ahora.dist - antes.dist) / antes.dist > 0.15, `dos pellizcos separándose: zoom (distancia ${antes.dist.toFixed(1)} → ${ahora.dist.toFixed(1)})`);
antes = ahora;
await nada();
await dos('puno', 'puno', 24, '(i) => { const a = i * 0.03; return [{ cx: 0.5 - 0.2 * Math.cos(a), cy: 0.55 - 0.2 * Math.sin(a) }, { cx: 0.5 + 0.2 * Math.cos(a), cy: 0.55 + 0.2 * Math.sin(a) }]; }');
ahora = await leer();
ok(Math.abs(ahora.ang - antes.ang) > 0.2, `dos puños como volante: giran el sistema (${(antes.ang * 57.3).toFixed(0)}° → ${(ahora.ang * 57.3).toFixed(0)}°)`);

const latencia = await pagina.evaluate(() => window.__modelo.gestos.stats.latenciaMs);
console.log(`  latencia del detector antes de simular: ${latencia.toFixed(0)} ms (en la nube, sin GPU; solo de referencia)`);
ok(errores.length === 0, `sin errores en la consola${errores.length ? `: ${errores.slice(0, 3).join(' | ')}` : ''}`);

// ---------- Sin permiso / sin cámara: el modelo sigue con mouse y teclado ----------
for (const [nombre, args, permisos] of [['permiso negado', ['--use-fake-device-for-media-stream'], []], ['sin cámara', [], ['camera']]]) {
  const nav = await chromium.launch({ ...(existsSync(CHROMIUM) ? { executablePath: CHROMIUM } : {}), args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', ...args] });
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, permissions: permisos });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/^https?:\/\//, (r) => r.abort());
  await p.goto('file://' + path.join(carpeta, 'index.html'));
  await p.waitForFunction(() => window.__modelo?.recorrido);
  await p.click('[data-usar-gestos]'); await p.click('[data-r="camara"]');
  await p.waitForTimeout(2500);
  await p.waitForFunction(() => !document.documentElement.classList.contains('en-intro'), null, { timeout: 15000 }); // la primera tecla salta la intro
  const aviso = await p.evaluate(() => [...document.querySelectorAll('.aviso-flotante, .permiso-camara, [role="alert"]')].map((n) => n.textContent.trim()).join(' ').slice(0, 120));
  const e0 = await p.evaluate(() => window.__modelo.estado.E);
  await p.keyboard.press('+'); await p.waitForTimeout(700);
  const eTecla = await p.evaluate(() => window.__modelo.estado.E);
  ok(aviso.length > 0 && Math.abs(eTecla - e0) > 5 && errs.length === 0, `${nombre}: avisa con claridad ("${aviso}") y el teclado sigue funcionando`);
  await nav.close();
}

await navegador.close();
console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
