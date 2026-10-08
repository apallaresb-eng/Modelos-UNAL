// Calidad adaptativa: mide los FPS reales del equipo y elige un nivel.
// La casilla "Calidad alta" fuerza el nivel máximo para lucirse un rato.

export const NIVELES = {
  baja: { nombre: 'baja', pixelRatio: 1, sombras: false, postProceso: false, particulas: 0.3, antialias: false },
  media: { nombre: 'media', pixelRatio: 1.5, sombras: true, postProceso: false, particulas: 0.6, antialias: true },
  alta: { nombre: 'alta', pixelRatio: 2, sombras: true, postProceso: true, particulas: 1, antialias: true },
};

const ORDEN = ['baja', 'media', 'alta'];

export function crearCalidad({ inicial = 'media', fpsMinimo = 45, muestraMs = 2500 } = {}) {
  const oyentes = new Set();
  let automatico = ORDEN.includes(inicial) ? inicial : 'media';
  let forzadaAlta = false;
  let frames = 0;
  let desde = performance.now();
  let ajustando = true;

  const actual = () => NIVELES[forzadaAlta ? 'alta' : automatico];
  const avisar = () => {
    const nivel = actual();
    document.documentElement.dataset.calidad = nivel.nombre;
    oyentes.forEach((fn) => fn(nivel));
  };

  return {
    get nivel() { return actual(); },
    get forzadaAlta() { return forzadaAlta; },
    alCambiar(fn) { oyentes.add(fn); fn(actual()); return () => oyentes.delete(fn); },
    forzarAlta(valor) { forzadaAlta = !!valor; avisar(); },
    // Llamar una vez por frame. Durante los primeros segundos baja de nivel si el equipo no da.
    tick() {
      if (!ajustando || forzadaAlta) return;
      frames++;
      const ahora = performance.now();
      if (ahora - desde < muestraMs) return;
      const fps = (frames * 1000) / (ahora - desde);
      frames = 0;
      desde = ahora;
      const i = ORDEN.indexOf(automatico);
      if (fps < fpsMinimo && i > 0) { automatico = ORDEN[i - 1]; avisar(); }
      else if (fps > 58 && i < ORDEN.length - 1 && automatico !== 'media') { automatico = ORDEN[i + 1]; avisar(); }
      else ajustando = false;
    },
  };
}

// Aplica un nivel a un WebGLRenderer de Three.js.
export function aplicarCalidadRenderer(renderer, nivel) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nivel.pixelRatio));
  renderer.shadowMap.enabled = nivel.sombras;
  renderer.shadowMap.needsUpdate = true;
}
