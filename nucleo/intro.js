// Entrada cinematográfica de 3–5 s: la cámara llega a la escena mientras aparece el título.
// Se salta con cualquier clic o tecla. Al terminar llama alTerminar (normalmente recorrido.ir(0)).
import * as THREE from 'three';
import gsap from 'gsap';

export function crearIntro({ camara, controles, desde, hasta, duracion = 4, titulo, subtitulo, alTerminar }) {
  const capa = document.createElement('div');
  capa.className = 'intro';
  capa.innerHTML = `<div><p class="intro__sub">${subtitulo ?? ''}</p><h1 class="intro__titulo">${titulo ?? ''}</h1><p class="intro__pista">Pulsa cualquier tecla para empezar</p></div>`;
  document.body.appendChild(capa);
  document.documentElement.classList.add('en-intro');

  const p0 = new THREE.Vector3(...desde.pos);
  const t0 = new THREE.Vector3(...desde.mirar);
  const p1 = new THREE.Vector3(...hasta.pos);
  const t1 = new THREE.Vector3(...hasta.mirar);
  camara.position.copy(p0);
  controles.target.copy(t0);
  const o = { t: 0 };
  let terminado = false;

  const tl = gsap.timeline({ onComplete: terminar });
  tl.to(o, {
    t: 1, duration: duracion, ease: 'power2.inOut',
    onUpdate: () => { camara.position.lerpVectors(p0, p1, o.t); controles.target.lerpVectors(t0, t1, o.t); },
  }, 0);
  tl.fromTo(capa.querySelector('.intro__sub'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.3);
  tl.fromTo(capa.querySelector('.intro__titulo'), { opacity: 0, y: 24, letterSpacing: '0.08em' }, { opacity: 1, y: 0, letterSpacing: '0em', duration: 1.2, ease: 'power3.out' }, 0.5);
  tl.fromTo(capa.querySelector('.intro__pista'), { opacity: 0 }, { opacity: 0.75, duration: 0.6 }, 1.6);
  tl.to(capa, { opacity: 0, duration: 0.7 }, duracion - 0.6);

  function terminar() {
    if (terminado) return;
    terminado = true;
    tl.progress(1).kill();
    camara.position.copy(p1);
    controles.target.copy(t1);
    capa.remove();
    document.documentElement.classList.remove('en-intro');
    removeEventListener('keydown', saltar);
    removeEventListener('pointerdown', saltar);
    alTerminar?.();
  }
  const saltar = () => terminar();
  addEventListener('keydown', saltar, { once: true });
  addEventListener('pointerdown', saltar, { once: true });
  return { saltar: terminar };
}
