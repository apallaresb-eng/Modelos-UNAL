// Clasificador de gestos de mano (puro, sin cámara): se prueba en Node con manos sintéticas.
// Entrada: puntos de MediaPipe Hands (21 por mano, coordenadas normalizadas x,y ∈ [0,1], z relativo).
// Índices: 0 muñeca · pulgar 1-4 · índice 5-8 · medio 9-12 · anular 13-16 · meñique 17-20.
//
// Catálogo (nombre → contexto). Una mano y dos manos; los de dos manos tienen prioridad.
export const CATALOGO = {
  mover: { contexto: 'base', manos: 1, icono: '✋', texto: 'Mano abierta: mover' },
  pausa: { contexto: 'base', manos: 1, icono: '✊', texto: 'Puño: pausa' },
  navegar: { contexto: 'base', manos: 1, icono: '👉', texto: 'Pulgar al lado: paso anterior/siguiente' },
  confirmar: { contexto: 'responder', manos: 1, icono: '👍', texto: 'Pulgar arriba: responder' },
  alternar: { contexto: 'vista', manos: 1, icono: '🤏', texto: 'Pellizco: cambiar de vista' },
  apuntar: { contexto: 'apuntar', manos: 1, icono: '☝️', texto: 'Señalar: apuntar' },
  perilla: { contexto: 'tiempo', manos: 1, icono: '✌️', texto: 'V y girar la muñeca: días' },
  aplauso: { contexto: 'sombra', manos: 2, icono: '👏', texto: 'Aplaudir: sombra de la Tierra' },
  zoom: { contexto: 'zoom', manos: 2, icono: '🤏🤏', texto: 'Pellizcar con las dos y separar: zoom' },
  volante: { contexto: 'rotar', manos: 2, icono: '✊✊', texto: 'Dos puños como volante: girar' },
};
export const MAX_ACTIVOS = 5;

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
const cos = (u, v) => (u.x * v.x + u.y * v.y + u.z * v.z) / (Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z) || 1);
const DEDOS = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]]; // [mcp, pip, punta]

export function analizarMano(p) {
  const palma = d(p[0], p[9]) || 1e-6;
  const extendido = DEDOS.map(([mcp, pip, punta]) => cos(sub(p[pip], p[mcp]), sub(p[punta], p[pip])) > 0.55 && d(p[0], p[punta]) > d(p[0], p[pip]) * 1.08);
  const doblado = DEDOS.map(([mcp, , punta]) => d(p[0], p[punta]) < d(p[0], p[mcp]) * 1.25);
  const pulgarRecto = cos(sub(p[3], p[2]), sub(p[4], p[3])) > 0.6;
  // Pulgar "fuera": su punta queda lejos del centro de la palma y más lejos de la muñeca que su articulación.
  const centro = { x: (p[0].x + p[5].x + p[9].x + p[17].x) / 4, y: (p[0].y + p[5].y + p[9].y + p[17].y) / 4, z: ((p[0].z ?? 0) + (p[5].z ?? 0) + (p[9].z ?? 0) + (p[17].z ?? 0)) / 4 };
  const pulgarFuera = d(p[4], centro) > palma * 0.55 && d(p[0], p[4]) > d(p[0], p[3]);
  return { palma, extendido, doblado, pulgar: pulgarRecto && pulgarFuera, pellizco: d(p[4], p[8]) / palma };
}

// Pose estática de una mano. espejo: la imagen está invertida (cámara frontal).
export function clasificarPose(p, { espejo = true } = {}) {
  const a = analizarMano(p);
  const nExt = a.extendido.filter(Boolean).length;
  const nDobl = a.doblado.filter(Boolean).length;
  if (a.pellizco < 0.3 && !a.doblado[0] && nDobl <= 2) return 'pellizco';
  if (a.pulgar && nDobl === 4) {
    const v = sub(p[4], p[2]);
    const dx = espejo ? -v.x : v.x;
    if (-v.y > Math.abs(dx) * 1.2) return 'pulgar-arriba';
    if (Math.abs(dx) > Math.abs(v.y) * 1.2) return dx > 0 ? 'pulgar-der' : 'pulgar-izq';
    return null;
  }
  if (nDobl === 4 && !a.pulgar) return 'puno';
  if (a.extendido[0] && nDobl >= 2 && a.doblado[1] && a.doblado[2] && a.doblado[3]) return 'senalar';
  if (a.extendido[0] && a.extendido[1] && a.doblado[2] && a.doblado[3]) return 'v';
  if (nExt === 4 && a.pulgar) return 'abierta';
  return null;
}

// Filtro One Euro (Casiez et al., 2012): suaviza sin retraso perceptible.
export class OneEuro {
  constructor({ minCutoff = 1.2, beta = 0.02, dCutoff = 1 } = {}) { Object.assign(this, { minCutoff, beta, dCutoff, x: null, dx: 0, t: null }); }
  static alfa(cutoff, dt) { const r = 2 * Math.PI * cutoff * dt; return r / (r + 1); }
  filtrar(valor, t) {
    if (this.x === null) { this.x = valor; this.t = t; return valor; }
    const dt = Math.max(1e-3, t - this.t); this.t = t;
    const dx = (valor - this.x) / dt;
    this.dx += OneEuro.alfa(this.dCutoff, dt) * (dx - this.dx);
    const corte = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alfa(corte, dt) * (valor - this.x);
    return this.x;
  }
  reiniciar() { this.x = null; this.dx = 0; }
}

const centroPalma = (p) => ({ x: (p[0].x + p[5].x + p[9].x + p[17].x) / 4, y: (p[0].y + p[5].y + p[9].y + p[17].y) / 4 });
const angulo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const desenvolver = (da) => ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;

// Capa temporal: estabiliza poses, genera eventos y valores continuos según los contextos activos.
export class MotorGestos {
  constructor({ espejo = true, alEvento = () => {} } = {}) {
    this.espejo = espejo;
    this.alEvento = alEvento;
    this.activos = new Set(['base']);
    this.estable = { pose: null, desde: 0, candidata: null, candidataDesde: 0 };
    this.disparado = new Set();
    this.filtroX = new OneEuro(); this.filtroY = new OneEuro();
    this.prev = {};
    this.ultimoNavegar = -1;
  }
  activar(contextos) {
    this.activos = new Set(['base', ...contextos]);
    const n = this.gestosActivos().length;
    if (n > MAX_ACTIVOS) console.warn(`Hay ${n} gestos activos; el máximo recomendado es ${MAX_ACTIVOS}.`);
  }
  gestosActivos() { return Object.entries(CATALOGO).filter(([, g]) => this.activos.has(g.contexto)).map(([n]) => n); }
  activo(n) { return this.activos.has(CATALOGO[n].contexto); }
  emitir(nombre, datos = {}) { if (this.activo(nombre)) this.alEvento(nombre, datos); }

  // manos: arreglo de arreglos de 21 puntos; t en segundos.
  procesar(manos, t) {
    const espejar = (p) => (this.espejo ? p.map((q) => ({ ...q, x: 1 - q.x })) : p);
    const ms = manos.map(espejar);
    const poses = ms.map((p) => clasificarPose(p, { espejo: false }));
    this.ultimas = { manos: ms, poses };
    if (ms.length === 2) { this.dosManos(ms, poses, t); this.estable.pose = null; return; }
    this.prev.dos = null;
    if (ms.length === 0) { this.estable = { pose: null, desde: t, candidata: null, candidataDesde: t }; this.disparado.clear(); this.filtroX.reiniciar(); this.filtroY.reiniciar(); this.prev = {}; return; }
    const p = ms[0];
    const pose = poses[0];
    // Estabilidad: una pose cuenta tras 120 ms seguidos.
    if (pose !== this.estable.candidata) { this.estable.candidata = pose; this.estable.candidataDesde = t; }
    if (pose === this.estable.candidata && t - this.estable.candidataDesde >= 0.12 && this.estable.pose !== pose) {
      this.estable.pose = pose; this.estable.desde = t; this.disparado.clear(); this.prev.perilla = null;
      this.alEvento('pose', { pose });
    }
    const estable = this.estable.pose;
    const dur = t - this.estable.desde;
    const una = (n, umbral, datos) => { if (dur >= umbral && !this.disparado.has(n)) { this.disparado.add(n); this.emitir(n, datos); } };
    if (estable === 'abierta') {
      const c = centroPalma(p);
      this.emitir('mover', { x: this.filtroX.filtrar(c.x, t), y: this.filtroY.filtrar(c.y, t) });
    }
    if (estable === 'puno') una('pausa', 0.25);
    if ((estable === 'pulgar-der' || estable === 'pulgar-izq') && t - this.ultimoNavegar > 0.8) {
      if (dur >= 0.3 && !this.disparado.has('navegar')) { this.ultimoNavegar = t; this.disparado.add('navegar'); this.emitir('navegar', { dir: estable === 'pulgar-der' ? 1 : -1 }); }
    }
    if (estable === 'pulgar-arriba') una('confirmar', 0.35);
    if (estable === 'pellizco') una('alternar', 0.2);
    if (estable === 'senalar') this.emitir('apuntar', { x: p[8].x, y: p[8].y });
    if (estable === 'v') {
      const a = angulo(p[0], { x: (p[8].x + p[12].x) / 2, y: (p[8].y + p[12].y) / 2 });
      if (this.prev.perilla != null) { const da = desenvolver(a - this.prev.perilla); if (Math.abs(da) > 0.002) this.emitir('perilla', { delta: da }); }
      this.prev.perilla = a;
    }
  }

  dosManos([a, b], [pa, pb], t) {
    const ca = centroPalma(a); const cb = centroPalma(b);
    const dist = Math.hypot(ca.x - cb.x, ca.y - cb.y);
    const ang = angulo(ca, cb);
    const prev = this.prev.dos;
    this.prev.dos = { dist, ang, t, pa, pb, lejos: prev?.lejos ?? (dist > 0.3 ? t : null) };
    if (dist > 0.3) this.prev.dos.lejos = t;
    if (!prev) return;
    if (pa === 'pellizco' && pb === 'pellizco' && prev.pa === 'pellizco' && prev.pb === 'pellizco' && prev.dist > 0.02) this.emitir('zoom', { factor: dist / prev.dist });
    if (pa === 'puno' && pb === 'puno' && prev.pa === 'puno' && prev.pb === 'puno') this.emitir('volante', { delta: desenvolver(ang - prev.ang) });
    // Aplauso: las palmas pasan de lejos (> 0.3) a juntas (< 0.1) en menos de 0,5 s.
    if (dist < 0.1 && prev.dist >= 0.1 && this.prev.dos.lejos != null && t - this.prev.dos.lejos < 0.5 && t - (this.prev.aplauso ?? -9) > 0.8) {
      this.prev.aplauso = t; this.emitir('aplauso');
    }
  }
}
