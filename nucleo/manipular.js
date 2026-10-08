// Manipulación directa: arrastrar objetos 3D de la escena para cambiar variables.
// El objeto se resalta al pasar el mouse (cursor "grab") y se arrastra sobre un plano.
// Uso:
//   crearAsa({ objeto: masa, camara, dom: canvas, controles,
//              plano: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),   // plano de arrastre
//              alArrastrar: (punto) => { …usa punto.y… }, alSoltar: () => {} });
import * as THREE from 'three';

export function crearAsa({ objeto, camara, dom, controles, plano, alEmpezar, alArrastrar, alSoltar, resaltar = true }) {
  const ray = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const punto = new THREE.Vector3();
  let arrastrando = false;
  let encima = false;
  const escalaBase = objeto.scale.clone();

  const aPuntero = (e) => {
    const r = dom.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(puntero, camara);
  };
  const tocaObjeto = () => ray.intersectObject(objeto, true).length > 0;

  function marcar(valor) {
    if (encima === valor) return;
    encima = valor;
    dom.style.cursor = valor ? 'grab' : '';
    if (resaltar) objeto.scale.copy(escalaBase).multiplyScalar(valor ? 1.06 : 1);
  }

  const abajo = (e) => {
    aPuntero(e);
    if (!tocaObjeto()) return;
    arrastrando = true;
    dom.setPointerCapture?.(e.pointerId);
    dom.style.cursor = 'grabbing';
    if (controles) controles.enabled = false;
    alEmpezar?.();
    e.preventDefault();
  };
  const mover = (e) => {
    aPuntero(e);
    if (!arrastrando) { marcar(tocaObjeto()); return; }
    if (ray.ray.intersectPlane(plano, punto)) alArrastrar(punto.clone());
  };
  const arriba = () => {
    if (!arrastrando) return;
    arrastrando = false;
    dom.style.cursor = encima ? 'grab' : '';
    if (controles) controles.enabled = true;
    alSoltar?.();
  };
  dom.addEventListener('pointerdown', abajo);
  dom.addEventListener('pointermove', mover);
  addEventListener('pointerup', arriba);

  return {
    get arrastrando() { return arrastrando; },
    destruir() {
      dom.removeEventListener('pointerdown', abajo);
      dom.removeEventListener('pointermove', mover);
      removeEventListener('pointerup', arriba);
    },
  };
}
