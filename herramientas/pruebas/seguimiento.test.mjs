// Pruebas del laboratorio: renderiza una pelota iluminada (Lambert + luz ambiente + ruido + fondo)
// en cada fase y comprueba que la fracción iluminada medida coincida con la real (error ≤ 0,05).
// Uso: node herramientas/pruebas/seguimiento.test.mjs
import { analizarFotograma } from '../../nucleo/seguimiento.js';
import { pelotaSintetica, azar } from './pelota-sintetica.mjs';

let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) fallos++; };
const errores = [];
const fuera = [];
for (let grados = 0; grados <= 150; grados += 15) {
  const i = (grados * Math.PI) / 180;
  const real = (1 + Math.cos(i)) / 2;
  for (const desde of [0, Math.PI, 0.6]) {
    const m = analizarFotograma(pelotaSintetica({ i, desde, R: 34 + azar() * 16, cx: 120 + azar() * 80 }));
    const medido = m?.k ?? NaN;
    if (real < 0.25) { fuera.push({ grados, err: Math.abs(medido - real), m }); continue; }
    errores.push(Math.abs(medido - real));
    if (!(Math.abs(medido - real) <= 0.05)) console.log(`   fase ${grados}° luz ${desde.toFixed(1)} rad: real ${real.toFixed(3)} medido ${medido.toFixed?.(3)}`);
  }
}
const maxErr = Math.max(...errores);
ok(maxErr <= 0.05, `rango válido (k ≥ 0,25, fases 0°–120°) × 3 direcciones: error máximo ${maxErr.toFixed(3)} (≤ 0,05)`);
ok(fuera.every(({ m, err }) => !m || !m.confiable || err <= m.incertidumbre), `crecientes delgadas (k < 0,25): se marcan como poco confiables o el error cabe en la incertidumbre (${fuera.map((f) => f.err.toFixed(2)).join(', ')})`);
const mLado = analizarFotograma(pelotaSintetica({ i: Math.PI / 2, desde: 0 }));
ok(mLado && mLado.luzDesde.x > 0.8, `detecta de qué lado viene la luz (cuarto: luz desde la derecha → x = ${mLado?.luzDesde.x.toFixed(2)})`);
const mNueva = analizarFotograma(pelotaSintetica({ i: Math.PI * 0.98 }));
ok(!mNueva || mNueva.k < 0.08, `casi luna nueva: no inventa una fase grande (k = ${mNueva?.k?.toFixed(3) ?? 'sin detección'})`);
console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
