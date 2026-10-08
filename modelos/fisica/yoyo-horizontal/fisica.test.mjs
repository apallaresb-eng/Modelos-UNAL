// Comprobaciones de la física contra las soluciones analíticas. Uso: node modelos/fisica/yoyo-horizontal/fisica.test.mjs
import { crearYoyo, avanzar, analizar, anguloCritico } from './fisica.js';
const base = { m: 0.06, Rmu: 0.028, Rc: 0.006, k: 0.5, mu: 0.5, F: 0.3, theta: 0 };
const ok = (c, msg) => console.log((c ? '✓ ' : '✗ ') + msg);
for (const caso of ['A', 'B']) {
  const s = caso === 'A' ? 1 : -1;
  const y = crearYoyo({ ...base, caso });
  for (let i = 0; i < 100; i++) avanzar(y, 0.01, true);
  const aTeo = base.F * (1 + s * base.Rc / base.Rmu) / (base.m * (1 + base.k));
  ok(Math.abs(y.a - aTeo) < 1e-9, `Caso ${caso}: a=${y.a.toFixed(4)} teórica=${aTeo.toFixed(4)} m/s²`);
  ok(Math.abs(y.x - 0.5 * aTeo * 1) < 1e-3, `Caso ${caso}: x(1s)=${y.x.toFixed(4)} vs ½at²=${(0.5 * aTeo).toFixed(4)}`);
  ok(Math.abs(y.v + y.omega * base.Rmu) < 1e-9, `Caso ${caso}: rueda sin deslizar (v+ωR=0)`);
  const r = analizar(y, true);
  ok(r.tauC < 0 === (caso === 'A'), `Caso ${caso}: τ cuerda ${r.tauC < 0 ? 'entra ⊗' : 'sale ⊙'}`);
  ok(r.tauF < 0, `Caso ${caso}: τ fricción entra ⊗ (f=${r.f.toFixed(4)} N)`);
  const I = base.k * base.m * base.Rmu ** 2;
  ok(Math.abs(I * r.alpha - (r.tauC + r.tauF)) < 1e-12, `Caso ${caso}: Iα = τc + τf`);
  if (caso === 'B') ok(Math.abs(r.tauF) > Math.abs(r.tauC), 'Caso B: |τ fricción| > |τ cuerda| (como dice el taller)');
}
// Dato curioso: Caso A con eje grueso → fricción hacia adelante
const yg = crearYoyo({ ...base, caso: 'A', Rc: 0.02 }); avanzar(yg, 0.01, true);
ok(yg.f > 0, `Caso A con Rc/Rμ=${(0.02/0.028).toFixed(2)} > k=0.5: fricción hacia ADELANTE (f=${yg.f.toFixed(4)} N)`);
// Paradoja: Caso B ángulo > crítico → izquierda
const tc = anguloCritico(base.Rc, base.Rmu);
for (const [th, esperado] of [[tc - 0.2, 1], [tc + 0.2, -1]]) {
  const y = crearYoyo({ ...base, caso: 'B', theta: th, F: 0.2 }); for (let i = 0; i < 50; i++) avanzar(y, 0.01, true);
  ok(Math.sign(y.v) === esperado, `Caso B θ=${(th * 180 / Math.PI).toFixed(1)}° (θc=${(tc * 180 / Math.PI).toFixed(1)}°): va hacia la ${y.v > 0 ? 'derecha' : 'izquierda'}`);
}
// Deslizamiento con F grande
const yd = crearYoyo({ ...base, caso: 'B', F: 1.0 }); avanzar(yd, 0.01, true);
ok(yd.estado === 'desliza' && Math.abs(Math.abs(yd.f) - base.mu * yd.N) < 1e-9, `F=1 N Caso B: ${yd.estado}, |f|=μN`);
// Al soltar sigue rodando a velocidad constante
const ys = crearYoyo({ ...base, caso: 'A' }); for (let i = 0; i < 50; i++) avanzar(ys, 0.01, true); const v0 = ys.v;
for (let i = 0; i < 50; i++) avanzar(ys, 0.01, false); ok(Math.abs(ys.v - v0) < 1e-12 && ys.f === 0, 'Sin cuerda: rueda a v constante, f=0');
// Mientras desliza, la velocidad del punto de contacto crece con aceleración constante
{
  const p = { ...base, caso: 'B', F: 1.0 };
  const y = crearYoyo(p); let r;
  for (let i = 0; i < 100; i++) r = avanzar(y, 0.01, true);
  const I = p.k * p.m * p.Rmu ** 2;
  const aCont = r.a + r.alpha * p.Rmu;
  ok(Math.abs((y.v + y.omega * p.Rmu) - aCont * 1) < 1e-6, `Desliza 1 s: v_contacto=${(y.v + y.omega * p.Rmu).toFixed(4)} vs a_contacto·t=${aCont.toFixed(4)} m/s`);
}
