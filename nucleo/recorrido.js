// Recorrido guiado (estilo Ciechanowski): una idea por paso, la cámara vuela y la escena actúa.
// Navegación: ← / → (o botones), número de paso, barra de progreso y "Explorar libre".
//
// crearRecorrido({
//   camara, controles,
//   pasos: [{ titulo, texto,                 // ≤ 25 palabras (lo exige `npm run calificar`)
//             camara: { pos: [x,y,z], mirar: [x,y,z], dur?: 1.6 } | () => ({ pos, mirar }),
//             entrar?: () => void, salir?: () => void }],
//   alModoLibre?: () => void,
// })
import * as THREE from 'three';
import gsap from 'gsap';

const aVec = (a) => (a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(...a));

export function crearRecorrido({ camara, controles, pasos, alModoLibre, contenedor = document.body }) {
  const caja = document.createElement('section');
  caja.className = 'recorrido';
  caja.setAttribute('aria-live', 'polite');
  caja.innerHTML = `
    <div class="recorrido__progreso"><i></i></div>
    <p class="recorrido__numero"></p>
    <h2 class="recorrido__titulo"></h2>
    <p class="recorrido__texto"></p>
    <div class="recorrido__botones">
      <button type="button" data-anterior aria-label="Paso anterior">←</button>
      <button type="button" data-siguiente aria-label="Paso siguiente">→</button>
      <button type="button" data-libre>Explorar libre</button>
    </div>`;
  contenedor.appendChild(caja);
  const [barra, numero, titulo, texto] = ['.recorrido__progreso i', '.recorrido__numero', '.recorrido__titulo', '.recorrido__texto'].map((s) => caja.querySelector(s));
  let actual = -1;
  let libre = false;
  let vuelo = null;

  function volar(destino) {
    const d = typeof destino === 'function' ? destino() : destino;
    if (!d) return;
    vuelo?.kill();
    const pos = aVec(d.pos);
    const mirar = aVec(d.mirar);
    const o = { ...camara.position, tx: controles.target.x, ty: controles.target.y, tz: controles.target.z };
    vuelo = gsap.to(o, {
      x: pos.x, y: pos.y, z: pos.z, tx: mirar.x, ty: mirar.y, tz: mirar.z,
      duration: d.dur ?? 1.6, ease: 'power3.inOut',
      onUpdate: () => { camara.position.set(o.x, o.y, o.z); controles.target.set(o.tx, o.ty, o.tz); },
    });
  }

  function ir(i) {
    i = Math.max(0, Math.min(pasos.length - 1, i));
    if (i === actual && !libre) return;
    pasos[actual]?.salir?.();
    actual = i;
    libre = false;
    document.documentElement.classList.remove('explorando');
    caja.classList.remove('recorrido--libre');
    const p = pasos[i];
    numero.textContent = `${i + 1} / ${pasos.length}`;
    barra.style.width = `${((i + 1) / pasos.length) * 100}%`;
    gsap.fromTo([titulo, texto], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
    titulo.textContent = p.titulo;
    texto.innerHTML = p.texto;
    caja.querySelector('[data-anterior]').disabled = i === 0;
    caja.querySelector('[data-siguiente]').textContent = i === pasos.length - 1 ? 'Explorar →' : '→';
    if (p.camara) volar(p.camara);
    p.entrar?.();
  }

  function modoLibre() {
    pasos[actual]?.salir?.();
    libre = true;
    caja.classList.add('recorrido--libre');
    document.documentElement.classList.add('explorando');
    numero.textContent = 'Modo libre';
    titulo.textContent = 'Explora tú';
    texto.textContent = 'Mueve las variables, arrastra los objetos y gira la cámara. Pulsa ← para volver al recorrido.';
    alModoLibre?.();
  }

  caja.querySelector('[data-anterior]').addEventListener('click', () => (libre ? ir(actual) : ir(actual - 1)));
  caja.querySelector('[data-siguiente]').addEventListener('click', () => (actual === pasos.length - 1 ? modoLibre() : ir(actual + 1)));
  caja.querySelector('[data-libre]').addEventListener('click', modoLibre);
  addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); actual === pasos.length - 1 ? modoLibre() : ir(actual + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); libre ? ir(actual) : ir(actual - 1); }
  });

  const api = {
    ir, modoLibre, volar,
    get paso() { return actual; },
    get libre() { return libre; },
    get total() { return pasos.length; },
  };
  // Lo usa `npm run calificar` para recorrer los pasos.
  (window.__modelo ??= {}).recorrido = api;
  return api;
}
