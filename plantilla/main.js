// PLANTILLA: oscilador masa-resorte amortiguado. Sirve de ejemplo de la estructura:
// física verificable (RK4) → escena → panel de variables → predice y verifica → herramientas.
// Al crear un modelo nuevo, reemplaza la física, la escena y los textos por los del tema.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  crearCalidad, aplicarCalidadRenderer, crearPanel, formula,
  crearGrabadora, capturaHD, crearPrediccion, crearBarraHerramientas,
} from '@nucleo';
import './estilo.css';

// ---------- Física: m·x'' = -k·x - b·x'  (integrada con RK4) ----------
const estado = { x: 0.6, v: 0 }; // x en metros (positivo = abajo del equilibrio)
let params = { m: 1, k: 20, b: 0.4 };

function derivadas(x, v) {
  return [v, (-params.k * x - params.b * v) / params.m];
}
function pasoRK4(dt) {
  const { x, v } = estado;
  const [a1, b1] = derivadas(x, v);
  const [a2, b2] = derivadas(x + (dt / 2) * a1, v + (dt / 2) * b1);
  const [a3, b3] = derivadas(x + (dt / 2) * a2, v + (dt / 2) * b2);
  const [a4, b4] = derivadas(x + dt * a3, v + dt * b3);
  estado.x += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
  estado.v += (dt / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
}
const periodo = () => 2 * Math.PI * Math.sqrt(params.m / params.k);

// ---------- Escena ----------
const canvas = document.querySelector('canvas.escena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camara.position.set(3.2, 0.4, 5.2);
const controles = new OrbitControls(camara, canvas);
controles.target.set(0, -0.2, 0);
controles.enableDamping = true;

escena.add(new THREE.HemisphereLight(0xbfe8ff, 0x0d1b2a, 1.2));
const sol = new THREE.DirectionalLight(0xffffff, 2.2);
sol.position.set(3, 5, 4);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
escena.add(sol);

const techo = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1), new THREE.MeshStandardMaterial({ color: 0x8fb3cc, roughness: 0.6 }));
techo.position.y = 1.6;
escena.add(techo);

// Resorte: hélice que se estira escalando en Y.
const VUELTAS = 12;
const puntos = [];
for (let i = 0; i <= 400; i++) {
  const t = i / 400;
  puntos.push(new THREE.Vector3(0.18 * Math.cos(t * VUELTAS * 2 * Math.PI), -t, 0.18 * Math.sin(t * VUELTAS * 2 * Math.PI)));
}
const resorte = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 600, 0.018, 8),
  new THREE.MeshStandardMaterial({ color: 0x5ad1ff, metalness: 0.6, roughness: 0.3 }),
);
resorte.castShadow = true;
resorte.position.y = 1.56;
escena.add(resorte);

const masa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xffb86b, roughness: 0.35 }));
masa.castShadow = true;
escena.add(masa);

const piso = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
piso.rotation.x = -Math.PI / 2;
piso.position.y = -1.9;
piso.receiveShadow = true;
escena.add(piso);

const L0 = 1.6; // longitud de equilibrio visual del resorte
function actualizarEscena() {
  const largo = L0 + estado.x;
  resorte.scale.y = largo;
  masa.position.y = 1.56 - largo - 0.2;
}

// Arrastrar la masa para soltarla desde otra posición.
const raycaster = new THREE.Raycaster();
const puntero = new THREE.Vector2();
let arrastrando = false;
canvas.addEventListener('pointerdown', (e) => {
  puntero.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(puntero, camara);
  if (raycaster.intersectObject(masa).length) { arrastrando = true; controles.enabled = false; }
});
addEventListener('pointermove', (e) => {
  if (!arrastrando) return;
  estado.x = THREE.MathUtils.clamp(estado.x + e.movementY * 0.006, -1, 1.2);
  estado.v = 0;
});
addEventListener('pointerup', () => { arrastrando = false; controles.enabled = true; });

// ---------- Interfaz ----------
formula(document.querySelector('[data-ecuacion]'), String.raw`m\,\ddot{x} = -k\,x - b\,\dot{x} \qquad T = 2\pi\sqrt{\tfrac{m}{k}}`);

const panel = crearPanel(document.querySelector('[data-variables]'), [
  { id: 'm', nombre: 'Masa', simbolo: 'm', unidad: 'kg', min: 0.2, max: 5, paso: 0.1, valor: params.m,
    que: 'Cuánta materia cuelga del resorte; es su inercia.', siSube: 'Oscila más lento: el periodo crece como √m.' },
  { id: 'k', nombre: 'Rigidez del resorte', simbolo: 'k', unidad: 'N/m', min: 2, max: 80, paso: 1, valor: params.k,
    que: 'Cuánta fuerza hace el resorte por cada metro que lo estiras.', siSube: 'Oscila más rápido y con rebotes más cortos.' },
  { id: 'b', nombre: 'Amortiguamiento', simbolo: 'b', unidad: 'kg/s', min: 0, max: 6, paso: 0.1, valor: params.b,
    que: 'Rozamiento con el aire y el propio resorte: le roba energía al movimiento.', siSube: 'Se detiene antes; con b muy alto ni siquiera alcanza a rebotar.' },
], (valores) => { params = valores; });

crearPrediccion(document.querySelector('[data-prediccion]'), {
  pregunta: 'Si duplicas la masa, ¿qué le pasa al tiempo de cada oscilación?',
  opciones: ['Se duplica', 'Crece un 41 % (×√2)', 'No cambia'],
  correcta: 1,
  explicacion: `T = 2π√(m/k): duplicar m multiplica T por √2 ≈ 1,41.`,
  demostrar: () => new Promise((ok) => {
    panel.fijar('m', Math.min(5, params.m * 2));
    estado.x = 0.6; estado.v = 0;
    setTimeout(ok, periodo() * 2000);
  }),
});

// ---------- Calidad, herramientas y bucle ----------
const calidad = crearCalidad();
calidad.alCambiar((nivel) => aplicarCalidadRenderer(renderer, nivel));

function ajustarTamano(ancho = innerWidth, alto = innerHeight) {
  renderer.setSize(ancho, alto, false);
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
}
addEventListener('resize', () => ajustarTamano());
ajustarTamano();

crearBarraHerramientas(document.querySelector('[data-herramientas]'), {
  calidad,
  grabadora: crearGrabadora(canvas, { nombre: 'oscilador' }),
  alCapturar: () => capturaHD(canvas, (w, h) => {
    const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    ajustarTamano(w, h);
    renderer.render(escena, camara);
    return () => { renderer.setPixelRatio(pr); ajustarTamano(); };
  }, { nombre: 'oscilador' }),
});

const reloj = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 1 / 20);
  if (!arrastrando) {
    const sub = 8; // sub-pasos para estabilidad con k alto
    for (let i = 0; i < sub; i++) pasoRK4(dt / sub);
  }
  actualizarEscena();
  controles.update();
  renderer.render(escena, camara);
  calidad.tick();
});
