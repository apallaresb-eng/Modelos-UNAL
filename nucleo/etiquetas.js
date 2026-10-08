// Etiquetas 3D dibujadas en un lienzo 2D encima de la escena:
// - nunca se tapan (prueban 8 posiciones alrededor del ancla y eligen la primera libre),
// - si se desplazan, dibujan una línea guía hasta el ancla,
// - tamaño mínimo legible en proyector (≥ 18 px a 1080p),
// - salen en Grabar y en Captura HD (se componen con el canvas WebGL).
import * as THREE from 'three';

const v = new THREE.Vector3();

export function crearEtiquetas(camara, canvasWebGL, { fuente = 'Nunito, system-ui, sans-serif', fondo = 'rgba(255,250,240,0.94)', borde = '#2b2118' } = {}) {
  const capa = document.createElement('canvas');
  capa.className = 'capa-etiquetas';
  Object.assign(capa.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none' });
  canvasWebGL.after(capa);
  const lista = [];

  function dibujar(ctx, ancho, alto, escalaPx = 1) {
    ctx.clearRect(0, 0, ancho, alto);
    const tam = Math.max(18, alto / 1080 * 22) * escalaPx;
    ctx.font = `800 ${tam}px ${fuente}`;
    ctx.textBaseline = 'middle';
    const ocupadas = [];
    const visibles = lista.filter((e) => e.visible !== false && e.texto)
      .sort((a, b) => (b.prioridad ?? 0) - (a.prioridad ?? 0));
    for (const e of visibles) {
      const ancla = typeof e.ancla === 'function' ? e.ancla() : e.ancla;
      v.copy(ancla).project(camara);
      if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) continue;
      const ax = (v.x * 0.5 + 0.5) * ancho;
      const ay = (-v.y * 0.5 + 0.5) * alto;
      const w = ctx.measureText(e.texto).width + tam * 1.1;
      const h = tam * 1.7;
      const sep = tam * 0.9 + (e.separacion ?? 0) * escalaPx;
      const preferida = e.lado ?? 'derecha';
      const candidatos = {
        derecha: [sep, -h / 2], izquierda: [-w - sep, -h / 2], arriba: [-w / 2, -h - sep], abajo: [-w / 2, sep],
        'arriba-derecha': [sep * 0.7, -h - sep * 0.7], 'arriba-izquierda': [-w - sep * 0.7, -h - sep * 0.7],
        'abajo-derecha': [sep * 0.7, sep * 0.7], 'abajo-izquierda': [-w - sep * 0.7, sep * 0.7],
      };
      const orden = [preferida, ...Object.keys(candidatos).filter((k) => k !== preferida)];
      let caja = null;
      for (const nombre of orden) {
        const [dx, dy] = candidatos[nombre];
        const c = { x: ax + dx, y: ay + dy, w, h };
        if (c.x < 4 || c.y < 4 || c.x + w > ancho - 4 || c.y + h > alto - 4) continue;
        if (!ocupadas.some((o) => c.x < o.x + o.w + 6 && c.x + c.w + 6 > o.x && c.y < o.y + o.h + 6 && c.y + c.h + 6 > o.y)) { caja = c; break; }
      }
      if (!caja) { // todo ocupado: se apila debajo de la última caja que estorba
        caja = { x: ax + sep, y: ay - h / 2, w, h };
        for (const o of ocupadas) if (caja.x < o.x + o.w && caja.x + w > o.x && caja.y < o.y + o.h && caja.y + h > o.y) caja.y = o.y + o.h + 6;
      }
      ocupadas.push(caja);
      // línea guía
      const cx = Math.max(caja.x, Math.min(ax, caja.x + w));
      const cy = Math.max(caja.y, Math.min(ay, caja.y + h));
      if (Math.hypot(cx - ax, cy - ay) > tam * 0.6) {
        ctx.strokeStyle = e.color; ctx.lineWidth = 2 * escalaPx;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(ax, ay, 3.5 * escalaPx, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = e.fondo ?? fondo; ctx.strokeStyle = e.borde ?? borde; ctx.lineWidth = 2.5 * escalaPx;
      ctx.beginPath(); ctx.roundRect(caja.x, caja.y, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = e.color;
      ctx.fillText(e.texto, caja.x + tam * 0.55, caja.y + h / 2 + tam * 0.04);
    }
  }

  return {
    capa,
    // e: { texto, color, ancla: Vector3 | () => Vector3, lado?, prioridad?, visible?, separacion? }
    agregar(e) { lista.push(e); return e; },
    actualizar() {
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(innerWidth * pr);
      const h = Math.round(innerHeight * pr);
      if (capa.width !== w || capa.height !== h) { capa.width = w; capa.height = h; }
      dibujar(capa.getContext('2d'), w, h, pr);
    },
    // Para Grabar / Captura HD: dibuja las etiquetas sobre otro contexto de cualquier tamaño.
    dibujarEn(ctx, ancho, alto) { dibujar(ctx, ancho, alto, alto / innerHeight); },
  };
}
