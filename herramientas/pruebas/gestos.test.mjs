// Pruebas del clasificador de gestos con manos sintéticas (ruido, rotación, escala y posición aleatorias).
// Exige ≥ 95 % de aciertos por pose y que los eventos temporales se disparen bien.
// Uso: node herramientas/pruebas/gestos.test.mjs
import { clasificarPose, MotorGestos, CATALOGO, MAX_ACTIVOS } from '../../nucleo/gestos-clasificador.js';
import { manoSintetica, POSES } from './manos-sinteticas.mjs';

let semilla = 7;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) fallos++; };

// 1. Exactitud por pose (300 muestras cada una)
const N = 300;
const matriz = {};
for (const [nombre, pose] of Object.entries(POSES)) {
  matriz[nombre] = {};
  for (let i = 0; i < N; i++) {
    const p = manoSintetica(pose, { rot: (azar() - 0.5) * 0.7, escala: 0.14 + azar() * 0.16, cx: 0.3 + azar() * 0.4, cy: 0.4 + azar() * 0.3, ruido: 0.0035, aleatorio: azar });
    const r = clasificarPose(p, { espejo: false }) ?? 'ninguna';
    matriz[nombre][r] = (matriz[nombre][r] ?? 0) + 1;
  }
  const aciertos = (matriz[nombre][nombre] ?? 0) / N;
  const errores = Object.entries(matriz[nombre]).filter(([k]) => k !== nombre).map(([k, v]) => `${k}:${v}`).join(' ');
  ok(aciertos >= 0.95, `${nombre.padEnd(14)} ${(aciertos * 100).toFixed(1)} % ${errores ? `(confusiones ${errores})` : ''}`);
}

// 2. Eventos temporales
const eventos = [];
const motor = new MotorGestos({ espejo: false, alEvento: (n, d) => eventos.push([n, d]) });
const reproducir = (pose, seg, desde, extra = {}) => { for (let t = 0; t < seg; t += 1 / 30) motor.procesar([manoSintetica(POSES[pose], { ruido: 0.002, aleatorio: azar, ...extra })], desde + t); return desde + seg; };
let t = reproducir('abierta', 0.5, 0);
ok(eventos.some(([n]) => n === 'mover'), 'mano abierta emite "mover"');
t = reproducir('puno', 0.6, t);
ok(eventos.filter(([n]) => n === 'pausa').length === 1, 'puño sostenido emite "pausa" una sola vez');
t = reproducir('pulgar-der', 0.6, t);
ok(eventos.some(([n, d]) => n === 'navegar' && d.dir === 1), 'pulgar a la derecha emite "navegar" +1');
t = reproducir('pellizco', 0.5, t);
ok(!eventos.some(([n]) => n === 'alternar'), '"alternar" NO se dispara si su contexto (vista) no está activo');
motor.activar(['vista', 'tiempo']);
t = reproducir('abierta', 0.3, t);
t = reproducir('pellizco', 0.5, t);
ok(eventos.some(([n]) => n === 'alternar'), 'con el contexto "vista" activo, el pellizco emite "alternar"');
// Perilla: V girando la muñeca
for (let i = 0; i < 30; i++) motor.procesar([manoSintetica(POSES.v, { rot: i * 0.03, ruido: 0.001, aleatorio: azar })], t + i / 30);
t += 1;
const giro = eventos.filter(([n]) => n === 'perilla').reduce((s, [, d]) => s + d.delta, 0);
ok(giro > 0.5, `V girando emite "perilla" (giro acumulado ${giro.toFixed(2)} rad)`);
// Dos manos: zoom con pellizco separándose
motor.activar(['zoom', 'sombra']);
for (let i = 0; i < 20; i++) {
  const sep = 0.15 + i * 0.01;
  motor.procesar([manoSintetica(POSES.pellizco, { cx: 0.5 - sep, ruido: 0.001, aleatorio: azar }), manoSintetica(POSES.pellizco, { cx: 0.5 + sep, ruido: 0.001, aleatorio: azar })], t + i / 30);
}
t += 1;
const zoom = eventos.filter(([n]) => n === 'zoom').reduce((s, [, d]) => s * d.factor, 1);
ok(zoom > 1.3, `dos pellizcos separándose emiten "zoom" (factor acumulado ×${zoom.toFixed(2)})`);
// Aplauso
for (let i = 0; i < 12; i++) {
  const sep = Math.max(0.02, 0.3 - i * 0.03);
  motor.procesar([manoSintetica(POSES.abierta, { cx: 0.5 - sep, ruido: 0.001, aleatorio: azar }), manoSintetica(POSES.abierta, { cx: 0.5 + sep, ruido: 0.001, aleatorio: azar })], t + i / 30);
}
ok(eventos.filter(([n]) => n === 'aplauso').length === 1, 'acercar las dos manos rápido emite un "aplauso"');

// 3. Catálogo y límite de gestos activos
ok(Object.keys(CATALOGO).length >= 10, `catálogo con ${Object.keys(CATALOGO).length} gestos`);
motor.activar(['vista']);
ok(motor.gestosActivos().length <= MAX_ACTIVOS, `con base + 1 contexto hay ${motor.gestosActivos().length} gestos activos (máx. ${MAX_ACTIVOS})`);

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
