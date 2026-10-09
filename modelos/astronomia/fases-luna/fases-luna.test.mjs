// Comprobaciones de la astronomía del modelo. Uso: node modelos/astronomia/fases-luna/fases-luna.test.mjs
import * as Astronomy from 'astronomy-engine';
import { fraccionIluminada, nombreFase, latitudLuna, hayEclipseLunar, lunaEnFecha, edadDias, MES_SINODICO, MES_SIDEREO, INCLINACION_ORBITA } from './astro.js';

let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) fallos++; };
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;

ok(cerca(fraccionIluminada(0), 0, 1e-12) && cerca(fraccionIluminada(90), 0.5, 1e-12) && cerca(fraccionIluminada(180), 1, 1e-12), 'k(nueva)=0, k(cuarto)=0,5, k(llena)=1');
ok(['Luna nueva', 'Cuarto creciente', 'Luna llena', 'Cuarto menguante'].join() === [0, 90, 180, 270].map(nombreFase).join(), 'nombres de las 4 fases principales');
ok(cerca(edadDias(180), MES_SINODICO / 2, 1e-9), `llena a los ${edadDias(180).toFixed(2)} días`);
// Relación entre meses: 1/sideral − 1/sinódico = 1/año
ok(cerca(1 / MES_SIDEREO - 1 / MES_SINODICO, 1 / 365.256, 2e-5), 'mes sinódico y sideral consistentes con el año sideral');
ok(cerca(latitudLuna(90, 0), INCLINACION_ORBITA, 1e-9) && cerca(latitudLuna(0, 0), 0, 1e-9), 'latitud máxima = inclinación (5,145°) a 90° del nodo; 0° en el nodo');

// Efemérides reales: eclipse lunar total del 14-mar-2025 y una llena sin eclipse
const llenaEclipse = Astronomy.SearchMoonPhase(180, Astronomy.MakeTime(new Date('2025-03-10T00:00Z')), 10).date;
const l1 = lunaEnFecha(llenaEclipse);
ok(llenaEclipse.toISOString().startsWith('2025-03-14') && Math.abs(l1.beta) < 0.5, `llena del ${llenaEclipse.toISOString().slice(0, 16)} con β = ${l1.beta.toFixed(2)}° → eclipse (real: total el 14-mar-2025)`);
ok(hayEclipseLunar(l1.E, l1.beta), 'el modelo marca eclipse en esa llena');
const llenaNormal = Astronomy.SearchMoonPhase(180, Astronomy.MakeTime(new Date('2025-06-01T00:00Z')), 40).date;
const l2 = lunaEnFecha(llenaNormal);
ok(!hayEclipseLunar(l2.E, l2.beta), `llena del ${llenaNormal.toISOString().slice(0, 10)} con β = ${l2.beta.toFixed(2)}° → sin eclipse`);
ok(cerca(l1.k, 1, 0.005), `en llena k = ${l1.k.toFixed(4)} ≈ 1`);

// Orientación en Bogotá: Luna creciente al atardecer → borde iluminado hacia abajo ("sonrisa")
const creciente = Astronomy.SearchMoonPhase(50, Astronomy.MakeTime(new Date('2026-01-01T00:00Z')), 40).date;
const atardecer = new Date(Date.UTC(creciente.getUTCFullYear(), creciente.getUTCMonth(), creciente.getUTCDate(), 23, 30)); // 18:30 en Bogotá
const lc = lunaEnFecha(atardecer);
ok(lc.altura > 0, `creciente del ${atardecer.toISOString().slice(0, 10)} a las 18:30 sobre el horizonte (altura ${lc.altura.toFixed(0)}°)`);
ok(Math.abs(lc.limbo - 180) < 70, `en Bogotá su borde iluminado apunta hacia abajo (desde el cénit: ${lc.limbo.toFixed(0)}°) → "sonrisa"`);

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
