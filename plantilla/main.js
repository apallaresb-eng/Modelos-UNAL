// PLANTILLA: oscilador masa-resorte amortiguado. Muestra la estructura que exige el estándar 9/10
// (skill estandar-calidad): intro → recorrido guiado → modo libre, con física verificable (RK4),
// HDRI real, post-procesado ligado a la calidad, etiquetas que no se tapan y manipulación directa.
// Al crear un modelo nuevo, reemplaza la física, la escena, el estilo y los textos por los del tema.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import {
  crearCalidad, aplicarCalidadRenderer, crearPanel, formula, crearGrabadora, capturaHD,
  crearPrediccion, crearBarraHerramientas, crearRecorrido, crearIntro, crearEtiquetas, crearAsa, crearPostproceso,
} from '@nucleo';
import hdriEstudio from '@recursos/hdri/ferndale_studio_04_1k.hdr';
import './estilo.css';

// ---------- Física: m·x'' = -k·x - b·x'  (integrada con RK4) ----------
const estado = { x: 0.6, v: 0 }; // x en metros (positivo = abajo del equilibrio)
let params = { m: 1, k: 20, b: 0.4 };
let pausado = false;

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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const escena = new THREE.Scene();
new HDRLoader().load(hdriEstudio, (tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  escena.environment = tex; // luz y reflejos reales de un estudio fotográfico (Poly Haven, CC0)
  escena.environmentIntensity = 0.9;
});
const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
const controles = new OrbitControls(camara, canvas);
controles.enableDamping = true;

const sol = new THREE.DirectionalLight(0xffffff, 1.6);
sol.position.set(3, 5, 4);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
escena.add(sol);

const techo = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1), new THREE.MeshStandardMaterial({ color: 0x8fb3cc, roughness: 0.4, metalness: 0.6 }));
techo.position.y = 1.6;
escena.add(techo);

const VUELTAS = 12;
const puntos = [];
for (let i = 0; i <= 400; i++) {
  const t = i / 400;
  puntos.push(new THREE.Vector3(0.18 * Math.cos(t * VUELTAS * 2 * Math.PI), -t, 0.18 * Math.sin(t * VUELTAS * 2 * Math.PI)));
}
const resorte = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 600, 0.018, 8),
  new THREE.MeshStandardMaterial({ color: 0x5ad1ff, metalness: 0.9, roughness: 0.22 }),
);
resorte.castShadow = true;
resorte.position.y = 1.56;
escena.add(resorte);

const masa = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshPhysicalMaterial({ color: 0xffb86b, roughness: 0.3, clearcoat: 0.6 }));
masa.castShadow = true;
escena.add(masa);

const piso = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
piso.rotation.x = -Math.PI / 2;
piso.position.y = -1.9;
piso.receiveShadow = true;
escena.add(piso);

const L0 = 1.6;
function actualizarEscena() {
  const largo = L0 + estado.x;
  resorte.scale.y = largo;
  masa.position.y = 1.56 - largo - 0.2;
}

// Etiquetas que no se tapan (salen también en Grabar y Captura HD)
const etiquetas = crearEtiquetas(camara, canvas);
const etiX = etiquetas.agregar({ texto: '', color: '#ffb86b', ancla: () => masa.position, lado: 'derecha', prioridad: 2 });
etiquetas.agregar({ texto: 'resorte  k', color: '#5ad1ff', ancla: () => new THREE.Vector3(0.2, 1.56 - (L0 + estado.x) / 2, 0), lado: 'izquierda' });

// Manipulación directa: arrastra la masa para soltarla desde otra altura.
crearAsa({
  objeto: masa, camara, dom: canvas, controles,
  plano: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  alEmpezar: () => { pausado = true; },
  alArrastrar: (p) => { estado.x = THREE.MathUtils.clamp(1.56 - L0 - 0.2 - p.y, -1, 1.2); estado.v = 0; },
  alSoltar: () => { pausado = false; },
});

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
  explicacion: 'T = 2π√(m/k): duplicar m multiplica T por √2 ≈ 1,41.',
  demostrar: () => new Promise((ok) => {
    panel.fijar('m', Math.min(5, params.m * 2));
    estado.x = 0.6; estado.v = 0;
    setTimeout(ok, periodo() * 2000);
  }),
});

// Recorrido guiado: una idea por paso (≤ 25 palabras), la cámara acompaña.
const recorrido = crearRecorrido({
  camara, controles,
  pasos: [
    { titulo: 'Un resorte que no para… ¿o sí?', texto: 'Arrastra la masa hacia abajo y suéltala.',
      camara: { pos: [3.2, 0.4, 5.2], mirar: [0, -0.2, 0] } },
    { titulo: 'La fuerza del resorte', texto: 'Cuanto más lo estiras, más jala de vuelta: F = −k·x.',
      camara: { pos: [1.6, 0.6, 3.2], mirar: [0, 0.4, 0] }, entrar: () => { estado.x = 0.7; estado.v = 0; } },
    { titulo: 'El rozamiento roba energía', texto: 'Con b alto, cada rebote es más pequeño hasta que se detiene.',
      camara: { pos: [-2.6, 0.2, 4.4], mirar: [0, -0.4, 0] }, entrar: () => panel.fijar('b', 1.2), salir: () => panel.fijar('b', 0.4) },
    { titulo: 'Predice', texto: 'Si duplicas la masa, ¿cuánto tarda cada oscilación? Elige tu respuesta a la derecha.',
      camara: { pos: [3.6, 1.2, 5.6], mirar: [0, -0.2, 0] } },
  ],
});

// ---------- Calidad, post-procesado, herramientas y bucle ----------
const post = crearPostproceso(renderer, escena, camara, { bloom: { intensity: 0.35, luminanceThreshold: 0.9, mipmapBlur: true } });
const calidad = crearCalidad();
calidad.alCambiar((nivel) => { aplicarCalidadRenderer(renderer, nivel); post.aplicarNivel(nivel); });

function ajustarTamano(ancho = innerWidth, alto = innerHeight) {
  renderer.setSize(ancho, alto, false);
  post.setSize(ancho, alto);
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
}
addEventListener('resize', () => ajustarTamano());
ajustarTamano();

const capas = [(ctx, w, h) => etiquetas.dibujarEn(ctx, w, h)];
crearBarraHerramientas(document.querySelector('[data-herramientas]'), {
  calidad,
  grabadora: crearGrabadora(canvas, { nombre: 'oscilador', capas }),
  alCapturar: () => capturaHD(canvas, (w, h) => {
    const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    ajustarTamano(w, h);
    post.render(0);
    return () => { renderer.setPixelRatio(pr); ajustarTamano(); };
  }, { nombre: 'oscilador', capas }),
});

crearIntro({
  camara, controles, titulo: '¿Por qué un resorte deja de rebotar?', subtitulo: 'Física · Oscilaciones',
  desde: { pos: [7, 3.5, 9], mirar: [0, 0.4, 0] }, hasta: { pos: [3.2, 0.4, 5.2], mirar: [0, -0.2, 0] },
  alTerminar: () => recorrido.ir(0),
});

const reloj = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 1 / 20);
  if (!pausado) for (let i = 0; i < 8; i++) pasoRK4(dt / 8); // sub-pasos para estabilidad con k alto
  actualizarEscena();
  etiX.texto = `x = ${(estado.x * 100).toFixed(0)} cm`;
  controles.update();
  post.render(dt);
  etiquetas.actualizar();
  calidad.tick();
});
