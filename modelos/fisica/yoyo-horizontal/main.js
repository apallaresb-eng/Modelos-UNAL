// Yoyo horizontal: torques de la cuerda y de la fricción (Casos A y B del taller de Física I, UNAL).
// Escala de la escena: 1 unidad = 1 cm. La física (fisica.js) trabaja en SI.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';

// Sin "lag smoothing": si un frame tarda (equipo lento), la cámara igual llega a tiempo.
gsap.ticker.lagSmoothing(0);
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import {
  crearCalidad, aplicarCalidadRenderer, crearPanel, formula,
  crearGrabadora, capturaHD, crearPrediccion, crearBarraHerramientas,
} from '@nucleo';
import { crearYoyo, avanzar, analizar, puntoCuerda, anguloCritico, G } from './fisica.js';
import './estilo.css';

const COLOR = {
  cuerda: 0xd62828, friccion: 0x1f8a7d, neto: 0xe09f3e, peso: 0x7f5539, normal: 0x5c677d,
  laca: 0x1d4e89, crema: 0xf4e9d8, madera: 0xb5651d, algodon: 0xf7efe2,
};
const CM = 100; // metros → unidades de escena
const ESCALA_FUERZA = 8; // cm por newton
const ESCALA_TORQUE = 1500; // cm por N·m (1,5 cm por mN·m)

// ---------- Estado físico ----------
const yoyo = crearYoyo({ m: 0.06, Rmu: 0.028, Rc: 0.006, k: 0.5, mu: 0.5, F: 0.3, theta: 0, caso: 'A' });
let tirando = false;
let tirandoTecla = false;
let escalaTiempo = 0.5;
const R = yoyo.p.Rmu * CM; // radio exterior en cm

// ---------- Renderer, escena y cámara ----------
const canvas = document.querySelector('canvas.escena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const escena = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 0.55;

const camara = new THREE.PerspectiveCamera(30, 1, 1, 2000);
const controles = new OrbitControls(camara, canvas);
controles.enableDamping = true;
controles.minDistance = 25;
controles.maxDistance = 220;
controles.maxPolarAngle = Math.PI * 0.49;
const VISTAS = {
  dibujo: new THREE.Vector3(0, 0, 50),
  '3d': new THREE.Vector3(24, 12, 40),
  arriba: new THREE.Vector3(0.01, 52, 16),
};
const foco = new THREE.Vector3(6, R, 0);
camara.position.copy(foco).add(VISTAS['3d']);
controles.target.copy(foco);

escena.add(new THREE.HemisphereLight(0xfff4e0, 0x8a6a4a, 1.1));
const sol = new THREE.DirectionalLight(0xffe2b8, 2.6);
sol.position.set(-25, 60, 40);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 200 });
sol.shadow.bias = -0.0005;
escena.add(sol, sol.target);

// ---------- Texturas procedurales (sin archivos: todo funciona offline) ----------
function texturaCanvas(ancho, alto, pintar) {
  const c = Object.assign(document.createElement('canvas'), { width: ancho, height: alto });
  pintar(c.getContext('2d'), ancho, alto);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const texMadera = texturaCanvas(1024, 256, (g, w, h) => {
  g.fillStyle = '#c98b52'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { // vetas
    const y0 = Math.random() * h;
    g.strokeStyle = `rgba(${90 + Math.random() * 40},${50 + Math.random() * 25},20,${0.12 + Math.random() * 0.2})`;
    g.lineWidth = 1 + Math.random() * 4;
    g.beginPath();
    for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.006 + i) * 8 + Math.sin(x * 0.02 + i * 3) * 2);
    g.stroke();
  }
  g.fillStyle = 'rgba(60,35,15,0.55)'; // marcas de regla cada 10 cm
  for (let i = 0; i < 10; i++) g.fillRect((i / 10) * w, 0, i === 0 ? 5 : 2, i === 0 ? 46 : 22);
});
texMadera.wrapS = texMadera.wrapT = THREE.RepeatWrapping;

const texCara = texturaCanvas(512, 512, (g, w) => { // cara del yoyo: rayos retro para ver el giro
  const c = w / 2;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#1d4e89' : '#f4e9d8';
    g.beginPath(); g.moveTo(c, c); g.arc(c, c, c, (i / 16) * Math.PI * 2, ((i + 1) / 16) * Math.PI * 2); g.fill();
  }
  g.fillStyle = '#d62828'; g.beginPath(); g.arc(c, c, c * 0.42, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2b2118'; g.lineWidth = 10; g.stroke();
  g.fillStyle = '#f4e9d8'; g.font = '800 120px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('★', c, c + 6);
});

const texAlgodon = texturaCanvas(256, 64, (g, w, h) => {
  g.fillStyle = '#f7efe2'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(140,110,80,0.35)';
  for (let x = 0; x < w; x += 5) { g.lineWidth = 1 + (x % 3); g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, h); g.stroke(); }
});
texAlgodon.wrapS = texAlgodon.wrapT = THREE.RepeatWrapping;

// ---------- Mesa ----------
const mesa = new THREE.Mesh(
  new THREE.BoxGeometry(6000, 3, 70),
  new THREE.MeshStandardMaterial({ map: texMadera, roughness: 0.62, metalness: 0 }),
);
texMadera.repeat.set(60, 1);
mesa.position.y = -1.5;
mesa.receiveShadow = true;
escena.add(mesa);

// ---------- Yoyo ----------
const grupoYoyo = new THREE.Group(); // se traslada
const giro = new THREE.Group(); // gira alrededor de z
grupoYoyo.add(giro);
escena.add(grupoYoyo);

const SEPARACION = 0.35; // media separación entre las dos mitades (cm)
const perfil = [
  [0, 0], [2.0, 0], [2.45, 0.12], [2.72, 0.38], [2.8, 0.7], [2.76, 1.05], [2.55, 1.38], [2.15, 1.58], [0, 1.62],
].map(([r, y]) => new THREE.Vector2(r, y + SEPARACION));
const laca = new THREE.MeshPhysicalMaterial({ color: COLOR.laca, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
for (const lado of [1, -1]) {
  const puntos = lado === 1 ? perfil : perfil.map((p) => new THREE.Vector2(p.x, -p.y)).reverse();
  const geo = new THREE.LatheGeometry(puntos, 96);
  geo.rotateX(Math.PI / 2);
  const mitad = new THREE.Mesh(geo, laca);
  mitad.castShadow = true;
  giro.add(mitad);

  const franja = new THREE.Mesh(new THREE.TorusGeometry(2.79, 0.07, 8, 96), new THREE.MeshStandardMaterial({ color: COLOR.crema, roughness: 0.4 }));
  franja.position.z = lado * (SEPARACION + 0.7);
  giro.add(franja);

  const cara = new THREE.Mesh(new THREE.CircleGeometry(2.1, 64), new THREE.MeshPhysicalMaterial({ map: texCara, roughness: 0.35, clearcoat: 1 }));
  cara.position.z = lado * (SEPARACION + 1.625);
  if (lado === -1) cara.rotation.y = Math.PI;
  giro.add(cara);
}
const eje = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, SEPARACION * 2 + 0.1, 24).rotateX(Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: COLOR.madera, roughness: 0.5 }),
);
giro.add(eje);
const carrete = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ map: texAlgodon, roughness: 0.9 }));
carrete.castShadow = true;
giro.add(carrete);
function actualizarCarrete() {
  carrete.geometry.dispose();
  carrete.geometry = new THREE.CylinderGeometry(yoyo.p.Rc * CM, yoyo.p.Rc * CM, SEPARACION * 2 - 0.04, 48).rotateX(Math.PI / 2);
}
actualizarCarrete();

// Cuerda (en el hueco del yoyo, z = 0) y mano
const LARGO_CUERDA = 16;
const cuerda = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), new THREE.MeshStandardMaterial({ color: COLOR.algodon, roughness: 0.9 }));
cuerda.castShadow = true;
const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 12, 32), new THREE.MeshStandardMaterial({ color: COLOR.madera, roughness: 0.45 }));
anillo.castShadow = true;
escena.add(cuerda, anillo);

// ---------- Vectores (siempre visibles, dibujados encima) ----------
function materialEncima(color) {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity: 0.96 });
}
class Flecha {
  constructor(color, grosor = 0.2) {
    this.g = new THREE.Group();
    this.tallo = new THREE.Mesh(new THREE.CylinderGeometry(grosor, grosor, 1, 12), materialEncima(color));
    this.punta = new THREE.Mesh(new THREE.ConeGeometry(grosor * 2.6, grosor * 6, 20), materialEncima(color));
    this.g.add(this.tallo, this.punta);
    this.g.renderOrder = 10;
    this.g.traverse((o) => { o.renderOrder = 10; });
    this.largoPunta = grosor * 6;
    escena.add(this.g);
  }
  fijar(origen, vector) {
    const largo = vector.length();
    this.g.visible = largo > 0.15;
    if (!this.g.visible) return;
    const punta = Math.min(this.largoPunta, largo * 0.6);
    this.g.position.copy(origen);
    this.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.clone().normalize());
    this.tallo.scale.y = largo - punta;
    this.tallo.position.y = (largo - punta) / 2;
    this.punta.scale.setScalar(punta / this.largoPunta);
    this.punta.position.y = largo - punta / 2;
  }
}

function crearEtiqueta(color) {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 128 });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.renderOrder = 12;
  s.scale.set(4.4, 1.1, 1);
  let actual = '';
  s.userData.texto = (texto) => {
    if (texto === actual) return;
    actual = texto;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 128);
    g.font = '800 64px Nunito, sans-serif';
    const w = Math.min(500, g.measureText(texto).width + 40);
    g.fillStyle = 'rgba(255,250,240,0.92)'; g.strokeStyle = '#2b2118'; g.lineWidth = 6;
    g.beginPath(); g.roundRect((512 - w) / 2, 14, w, 100, 30); g.fill(); g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(texto, 256, 66);
    t.needsUpdate = true;
  };
  escena.add(s);
  return s;
}
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

const flechaF = new Flecha(COLOR.cuerda);
const flechaFr = new Flecha(COLOR.friccion);
const flechaN = new Flecha(COLOR.normal, 0.14);
const flechaP = new Flecha(COLOR.peso, 0.14);
const flechaTc = new Flecha(COLOR.cuerda, 0.32);
const flechaTf = new Flecha(COLOR.friccion, 0.32);
const etiF = crearEtiqueta(hex(COLOR.cuerda));
const etiFr = crearEtiqueta(hex(COLOR.friccion));
const etiN = crearEtiqueta(hex(COLOR.normal));
const etiP = crearEtiqueta(hex(COLOR.peso));
const etiTc = crearEtiqueta(hex(COLOR.cuerda));
const etiTf = crearEtiqueta(hex(COLOR.friccion));
const etiRc = crearEtiqueta('#2b2118');
const etiRmu = crearEtiqueta('#2b2118');
[etiN, etiP, etiRc, etiRmu].forEach((e) => e.scale.set(3.2, 0.8, 1));

// Brazos de palanca Rc y Rμ (líneas punteadas)
function lineaPunteada() {
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
  const l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x2b2118, dashSize: 0.35, gapSize: 0.25, depthTest: false }));
  l.renderOrder = 11;
  escena.add(l);
  return (a, b) => { geo.setFromPoints([a, b]); l.computeLineDistances(); };
}
const brazoRc = lineaPunteada();
const brazoRmu = lineaPunteada();

// Flecha curva que muestra el sentido de giro (mostaza = torque neto)
const arcoGiro = new THREE.Group();
const arco = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.16, 8, 64, Math.PI * 1.1), materialEncima(COLOR.neto));
const puntaArco = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 16), materialEncima(COLOR.neto));
arcoGiro.add(arco, puntaArco);
arcoGiro.traverse((o) => { o.renderOrder = 9; });
escena.add(arcoGiro);
function orientarArco(horario) {
  const fin = Math.PI * 1.1;
  arco.rotation.z = Math.PI * 0.95;
  puntaArco.position.set(4.1 * Math.cos(fin + arco.rotation.z), 4.1 * Math.sin(fin + arco.rotation.z), 0);
  puntaArco.rotation.z = fin + arco.rotation.z + (horario ? Math.PI : 0);
  arcoGiro.scale.set(horario ? -1 : 1, 1, 1);
}

// ---------- Actualizar la escena con la física ----------
const v3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const zTxt = (tz) => (Math.abs(tz) < 1e-7 ? '0' : tz < 0 ? '⊗ entra' : '⊙ sale');

function actualizarEscena(r) {
  const xs = (yoyo.x * CM) % 2000; // la mesa se repite cada 100 cm: el bucle es invisible
  const centro = v3(xs, R, 0);
  grupoYoyo.position.copy(centro);
  giro.rotation.z = yoyo.phi;

  const { theta, Rc } = yoyo.p;
  const pc = puntoCuerda(yoyo.p.caso, Rc * CM, theta);
  const tangente = v3(xs + pc.x, R + pc.y, 0);
  const u = v3(Math.cos(theta), Math.sin(theta), 0);
  const mano = tangente.clone().addScaledVector(u, LARGO_CUERDA);
  cuerda.position.copy(tangente).lerp(mano, 0.5);
  cuerda.scale.y = LARGO_CUERDA;
  cuerda.quaternion.setFromUnitVectors(v3(0, 1, 0), u);
  anillo.position.copy(mano).addScaledVector(u, 0.7);
  anillo.rotation.set(0, Math.PI / 2, theta);

  const contacto = v3(xs, 0.05, 0);
  flechaF.fijar(tangente, u.clone().multiplyScalar(r.F * ESCALA_FUERZA));
  flechaFr.fijar(contacto, v3(r.f * ESCALA_FUERZA, 0, 0));
  // N y mg son colineales: se separan un poco para que se vean las dos.
  flechaN.fijar(contacto.clone().add(v3(0.45, 0, 0)), v3(0, r.N * ESCALA_FUERZA, 0));
  flechaP.fijar(centro.clone().add(v3(-0.45, 0, 0)), v3(0, -yoyo.p.m * G * ESCALA_FUERZA, 0));
  // Torques: vectores sobre el eje z, saliendo del centro.
  const frente = v3(xs, R, 0);
  flechaTc.fijar(frente.clone().add(v3(0, 0.55, 0)), v3(0, 0, r.tauC * ESCALA_TORQUE));
  flechaTf.fijar(frente.clone().add(v3(0, -0.55, 0)), v3(0, 0, r.tauF * ESCALA_TORQUE));

  const fin = (fl, o, vec, extra = 1.6) => o.clone().add(vec.clone().setLength(vec.length() + extra));
  etiF.visible = r.F > 0;
  etiF.position.copy(fin(flechaF, tangente, u.clone().multiplyScalar(r.F * ESCALA_FUERZA), 2.6));
  etiF.userData.texto(`F = ${r.F.toFixed(2)} N`);
  etiFr.visible = Math.abs(r.f) > 0.002;
  etiFr.position.copy(contacto).add(v3(r.f * ESCALA_FUERZA + Math.sign(r.f) * 2.8, -0.9, 0));
  etiFr.userData.texto(`f = ${Math.abs(r.f).toFixed(2)} N`);
  etiN.position.copy(contacto).add(v3(1.9, r.N * ESCALA_FUERZA + 0.4, 0));
  etiN.userData.texto('N');
  etiP.position.copy(centro).add(v3(-2.1, -yoyo.p.m * G * ESCALA_FUERZA * 0.85, 0));
  etiP.userData.texto('mg');
  etiTc.visible = Math.abs(r.tauC) > 1e-6;
  etiTc.position.copy(frente).add(v3(-7.4, 2.4, 0));
  etiTc.userData.texto(`τc ${zTxt(r.tauC)}`);
  etiTf.visible = Math.abs(r.tauF) > 1e-6;
  etiTf.position.copy(frente).add(v3(-7.4, 1.0, 0));
  etiTf.userData.texto(`τμ ${zTxt(r.tauF)}`);

  brazoRc(centro, tangente);
  etiRc.position.copy(centro).lerp(tangente, 0.5).add(v3(-1.5, 0, 0.2));
  etiRc.userData.texto('Rc');
  brazoRmu(centro, contacto);
  etiRmu.position.copy(centro).lerp(contacto, 0.5).add(v3(-1.5, -0.2, 0.2));
  etiRmu.userData.texto('Rμ');

  const giraHorario = r.alpha < -1e-6 || (Math.abs(r.alpha) <= 1e-6 && yoyo.omega < -1e-6);
  const giraAlgo = Math.abs(r.alpha) > 1e-6 || Math.abs(yoyo.omega) > 1e-6;
  arcoGiro.visible = giraAlgo;
  arcoGiro.position.copy(centro);
  orientarArco(giraHorario);

  sol.position.set(xs - 25, 60, 40);
  sol.target.position.set(xs, 0, 0);
  mesa.position.x = Math.round(xs / 100) * 100;
}

// ---------- Interfaz ----------
formula(document.querySelector('[data-ecuacion]'), String.raw`\begin{aligned}
\textstyle\sum F_x:&\; m\,a = F\cos\theta + f\\
\textstyle\sum \tau:&\; I\,\alpha = \tau_c + \tau_\mu,\quad \vec\tau = \vec r\times\vec F\\
\text{rueda:}&\; a = -R_\mu\,\alpha_z\\[2pt]
\Rightarrow&\; a = \dfrac{F\,(\cos\theta \pm R_c/R_\mu)}{m\,(1+k)}
\end{aligned}`);

const aRad = (g) => (g * Math.PI) / 180;
crearPanel(document.querySelector('[data-variables]'), [
  { id: 'F', nombre: 'Fuerza de la cuerda', simbolo: 'F', unidad: 'N', min: 0, max: 1, paso: 0.01, valor: 0.3,
    que: 'Qué tan fuerte jalas la cuerda.', siSube: 'El yoyo acelera más. Si te pasas, la fricción no alcanza y el yoyo patina (desliza).' },
  { id: 'Rc', nombre: 'Radio de la cuerda', simbolo: 'R_c', unidad: 'cm', min: 0.3, max: 2.4, paso: 0.1, valor: 0.6,
    que: 'Distancia del centro del yoyo a donde sale la cuerda (el brazo de palanca de F).', siSube: 'Crece el torque de la cuerda τc = Rc·F. En el Caso A llega un punto en que la fricción cambia de sentido.' },
  { id: 'theta', nombre: 'Ángulo de la cuerda (bonus)', simbolo: '\\theta', unidad: '°', min: 0, max: 85, paso: 1, valor: 0,
    que: 'Inclinación de la cuerda sobre la horizontal. El taller usa θ = 0°.', siSube: 'En el Caso B, pasado el ángulo crítico (cos θc = Rc/Rμ), ¡el yoyo rueda alejándose de ti! Es la paradoja del carrete.' },
  { id: 'mu', nombre: 'Coeficiente de fricción', simbolo: '\\mu', unidad: '', min: 0.05, max: 1, paso: 0.05, valor: 0.5,
    que: 'Qué tan "agarrador" es el suelo. La fricción estática puede valer cualquier cosa entre 0 y μN.', siSube: 'Aguanta fuerzas más grandes sin patinar. No cambia la aceleración mientras rueda sin deslizar.' },
  { id: 'k', nombre: 'Distribución de masa', simbolo: 'k=\\tfrac{I}{mR_\\mu^2}', unidad: '', min: 0.3, max: 1, paso: 0.05, valor: 0.5,
    que: 'Qué tan lejos del centro está la masa: 0,5 = disco macizo, 1 = toda la masa en el borde (aro).', siSube: 'Cuesta más hacerlo girar: acelera menos y cambia cuánta fricción necesita.' },
], (v, id) => {
  Object.assign(yoyo.p, { F: v.F, Rc: v.Rc / 100, theta: aRad(v.theta), mu: v.mu, k: v.k });
  if (id === 'Rc') actualizarCarrete();
});

const botonesCaso = document.querySelectorAll('[data-caso]');
function fijarCaso(caso) {
  yoyo.p.caso = caso;
  botonesCaso.forEach((b) => b.classList.toggle('activo', b.dataset.caso === caso));
}
botonesCaso.forEach((b) => b.addEventListener('click', () => fijarCaso(b.dataset.caso)));

const botonTirar = document.querySelector('[data-tirar]');
function fijarTirando(valor) {
  tirando = valor;
  botonTirar.classList.toggle('activo', tirando || tirandoTecla);
  botonTirar.textContent = tirando || tirandoTecla ? '■ Soltar la cuerda' : '▶ Tirar de la cuerda';
}
botonTirar.addEventListener('click', () => fijarTirando(!tirando));
function reiniciar() {
  Object.assign(yoyo, { x: 0, v: 0, phi: 0, omega: 0 });
  fijarTirando(false);
}
document.querySelector('[data-reiniciar]').addEventListener('click', reiniciar);
addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || /INPUT|BUTTON/.test(e.target.tagName)) return;
  e.preventDefault(); tirandoTecla = true; fijarTirando(tirando);
});
addEventListener('keyup', (e) => {
  if (e.code !== 'Space') return;
  tirandoTecla = false; fijarTirando(tirando);
});

document.querySelectorAll('[data-tiempo]').forEach((b) => b.addEventListener('click', () => {
  escalaTiempo = Number(b.dataset.tiempo);
  document.querySelectorAll('[data-tiempo]').forEach((x) => x.classList.toggle('activo', x === b));
}));

let vuelo = null; // offset de cámara animado con GSAP
function irAVista(nombre) {
  document.querySelectorAll('[data-vista]').forEach((x) => x.classList.toggle('activo', x.dataset.vista === nombre));
  const actual = camara.position.clone().sub(controles.target);
  vuelo = { x: actual.x, y: actual.y, z: actual.z };
  gsap.to(vuelo, { ...VISTAS[nombre], duration: 1.2, ease: 'power3.inOut', onComplete: () => { vuelo = null; } });
}
document.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => irAVista(b.dataset.vista)));

// Tablero de lectura en vivo
const tablero = document.querySelector('[data-tablero]');
const ESTADOS = { rueda: 'Rueda sin deslizar', desliza: '¡Desliza!', quieto: 'Quieto', levanta: '¡La cuerda lo levanta!' };
function pintarTablero(r) {
  const { mu, Rc, Rmu, k, caso, theta } = yoyo.p;
  const dir = Math.abs(yoyo.v) < 1e-4 && Math.abs(r.a) < 1e-6 ? 'no se mueve'
    : (Math.abs(yoyo.v) > 1e-4 ? yoyo.v : r.a) > 0 ? '→ derecha' : '← izquierda';
  const fDir = Math.abs(r.f) < 1e-5 ? '' : r.f > 0 ? '→ adelante' : '← atrás';
  const uso = r.N > 0 ? Math.min(100, (Math.abs(r.f) / (mu * r.N)) * 100) : 0;
  const tauNeto = r.tauC + r.tauF;
  const mNm = (t) => `${(Math.abs(t) * 1000).toFixed(2)} mN·m`;
  let aviso = '';
  if (r.estado === 'levanta') {
    aviso = `<p class="aviso"><strong>¡Se levanta!</strong> F·senθ supera el peso mg: ya no hay contacto con el suelo ni fricción.</p>`;
  } else if (caso === 'A' && r.f > 1e-5) {
    aviso = `<p class="aviso"><strong>¡Dato curioso!</strong> Aquí la fricción apunta <b>hacia adelante</b>, no se opone al movimiento. El eje es grueso (Rc/Rμ = ${(Rc / Rmu).toFixed(2)} &gt; ${theta > 0.005 ? `k·cosθ = ${(k * Math.cos(theta)).toFixed(2)}` : `k = ${k.toFixed(2)}`}), y la cuerda sola lo haría girar más rápido de lo que avanza. El suelo "frena" el giro empujando hacia adelante.</p>`;
  } else if (caso === 'B' && theta > 0.01) {
    const tc = (anguloCritico(Rc, Rmu) * 180) / Math.PI;
    aviso = `<p class="aviso"><strong>Paradoja del carrete:</strong> el ángulo crítico es θc = ${tc.toFixed(1)}° (cos θc = Rc/Rμ). ${theta * 180 / Math.PI < tc ? 'Por debajo de él rueda hacia la cuerda.' : 'Por encima de él ¡rueda alejándose de la cuerda!'}</p>`;
  }
  tablero.innerHTML = `
    <h2>Caso ${caso} <span class="estado estado--${r.estado}">${ESTADOS[r.estado]}</span></h2>
    <dl class="lecturas">
      <dt>Movimiento</dt><dd><b>${dir}</b> · a = ${Math.abs(r.a).toFixed(2)} m/s² · v = ${Math.abs(yoyo.v).toFixed(2)} m/s</dd>
      <dt class="c-cuerda">τ cuerda</dt><dd class="c-cuerda"><span class="simbolo-z">${zTxt(r.tauC)}</span> · ${mNm(r.tauC)}</dd>
      <dt class="c-friccion">τ fricción</dt><dd class="c-friccion"><span class="simbolo-z">${zTxt(r.tauF)}</span> · ${mNm(r.tauF)}</dd>
      <dt class="c-neto">τ neto</dt><dd class="c-neto"><span class="simbolo-z">${zTxt(tauNeto)}</span> · ${mNm(tauNeto)} ${Math.abs(tauNeto) > 1e-7 ? (tauNeto < 0 ? '(gira ↻ horario)' : '(gira ↺ antihorario)') : ''}</dd>
      <dt class="c-friccion">Fricción</dt><dd class="c-friccion">f = ${Math.abs(r.f).toFixed(3)} N ${fDir}
        <div class="barra-friccion" title="Fricción usada respecto al máximo μN"><i style="width:${uso}%"></i></div>
        <small>usa el ${uso.toFixed(0)} % del máximo μN = ${(mu * r.N).toFixed(3)} N${r.estado === 'rueda' ? ' (estática: vale lo necesario)' : ''}</small></dd>
    </dl>${aviso}`;
}

// Conclusión del taller, calculada con los parámetros actuales
function fraseB(r) {
  const neto = r.tauC + r.tauF;
  if (Math.abs(r.a) < 1e-6) return 'En el Caso B, con este ángulo, los torques se equilibran: el yoyo no rueda.';
  if (r.a < 0) return 'En el Caso B, con la cuerda tan inclinada, el neto sale: el yoyo gira en sentido antihorario y rueda hacia la izquierda (paradoja del carrete).';
  return `En el Caso B, |τ fricción| ${Math.abs(r.tauF) > Math.abs(r.tauC) ? '&gt;' : '&lt;'} |τ cuerda|: el neto ${neto < 0 ? 'entra' : 'sale'} y el yoyo gira en sentido ${neto < 0 ? 'horario' : 'antihorario'}, hacia la derecha.`;
}
const conclusion = document.querySelector('[data-conclusion]');
conclusion.classList.add('conclusion');
let firmaConclusion = '';
function pintarConclusion() {
  const filas = ['A', 'B'].map((caso) => {
    const prueba = crearYoyo({ ...yoyo.p, caso, F: yoyo.p.F || 0.3 });
    const r = analizar(prueba, true);
    return { caso, r };
  });
  const firma = JSON.stringify(filas.map(({ r }) => [Math.sign(r.tauC), Math.sign(r.tauF), Math.sign(r.a), r.estado]));
  if (firma === firmaConclusion) return;
  firmaConclusion = firma;
  conclusion.innerHTML = `
    <h3>Conclusión: ¿qué torques entran y cuáles salen?</h3>
    <table>
      <tr><th>Caso</th><th class="c-cuerda">τ cuerda</th><th class="c-friccion">τ fricción</th><th>Rueda</th></tr>
      ${filas.map(({ caso, r }) => `<tr><td><b>${caso}</b></td><td class="z c-cuerda">${zTxt(r.tauC)}</td><td class="z c-friccion">${zTxt(r.tauF)}</td><td>${r.a > 1e-6 ? '→ derecha' : r.a < -1e-6 ? '← izquierda' : 'no rueda'}</td></tr>`).join('')}
    </table>
    <p>Regla de la mano derecha: los dedos van del centro al punto donde actúa la fuerza (r), se doblan hacia F, y el pulgar marca τ = r × F. ⊗ entra al plano del dibujo y ⊙ sale. ${fraseB(filas[1].r)}</p>`;
}

// Predice y verifica
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const cajaPrediccion = document.querySelector('[data-prediccion]');
const panelInputs = () => document.querySelectorAll('[data-variables] input');
function fijarVariable(i, valor) { const el = panelInputs()[i]; el.value = valor; el.dispatchEvent(new Event('input')); }
async function demo({ caso, theta = 0 }) {
  fijarCaso(caso); fijarVariable(0, 0.3); fijarVariable(1, 0.6); fijarVariable(2, theta);
  irAVista('dibujo'); reiniciar();
  await esperar(900);
  fijarTirando(true);
  await esperar(1400);
  fijarTirando(false);
}
crearPrediccion(cajaPrediccion, {
  pregunta: 'Caso B: la cuerda sale por DEBAJO del eje y la jalas hacia la derecha. ¿Hacia dónde rueda el yoyo?',
  opciones: ['← Izquierda', '→ Derecha', 'No se mueve'],
  correcta: 1,
  explicacion: 'Rueda hacia la derecha, igual que en el Caso A, aunque τ cuerda ahora sale del plano. Truco: mira los torques respecto al punto de contacto con el suelo. Ahí la fricción y la normal no hacen torque, y el de la cuerda, F·(Rμ − Rc), es horario porque Rμ > Rc.',
  demostrar: () => demo({ caso: 'B' }),
});
crearPrediccion(cajaPrediccion, {
  pregunta: 'Bonus: mismo Caso B, pero con la cuerda inclinada 80° hacia arriba. ¿Y ahora?',
  opciones: ['→ Derecha, como siempre', '← Izquierda', 'Se queda quieto'],
  correcta: 1,
  explicacion: 'Al inclinar la cuerda, su línea de acción pasa al otro lado del punto de contacto y el torque respecto al suelo, F·(Rc − Rμ cosθ), cambia de signo. Pasado θc (cos θc = Rc/Rμ, θc ≈ 77,6°) el yoyo se aleja de la cuerda.',
  demostrar: () => demo({ caso: 'B', theta: 80 }),
});

// ---------- Calidad, herramientas y bucle ----------
const calidad = crearCalidad();
calidad.alCambiar((nivel) => {
  aplicarCalidadRenderer(renderer, nivel);
  const tam = nivel.nombre === 'alta' ? 2048 : 1024;
  if (sol.shadow.mapSize.x !== tam) {
    sol.shadow.mapSize.set(tam, tam);
    sol.shadow.map?.dispose();
    sol.shadow.map = null;
  }
  escena.environmentIntensity = nivel.nombre === 'baja' ? 0.35 : 0.55;
});

function ajustarTamano(ancho = innerWidth, alto = innerHeight) {
  renderer.setSize(ancho, alto, false);
  camara.aspect = ancho / alto;
  camara.updateProjectionMatrix();
}
addEventListener('resize', () => ajustarTamano());
ajustarTamano();

crearBarraHerramientas(document.querySelector('[data-herramientas]'), {
  calidad,
  grabadora: crearGrabadora(canvas, { nombre: 'yoyo-torques' }),
  alCapturar: () => capturaHD(canvas, (w, h) => {
    const pr = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    ajustarTamano(w, h);
    renderer.render(escena, camara);
    return () => { renderer.setPixelRatio(pr); ajustarTamano(); };
  }, { nombre: 'yoyo-torques' }),
});

const reloj = new THREE.Clock();
let ultimoTablero = 0;
let xsAnterior = 0;
renderer.setAnimationLoop((t) => {
  const dt = Math.min(reloj.getDelta(), 1 / 20) * escalaTiempo;
  const r = avanzar(yoyo, dt, tirando || tirandoTecla, 16);
  actualizarEscena(r);

  // La cámara acompaña al yoyo sin perder la rotación que haya hecho el usuario.
  const xs = grupoYoyo.position.x;
  const dx = xs - xsAnterior;
  xsAnterior = xs;
  controles.target.x += dx;
  camara.position.x += dx;
  if (vuelo) camara.position.set(controles.target.x + vuelo.x, controles.target.y + vuelo.y, controles.target.z + vuelo.z);
  controles.update();
  renderer.render(escena, camara);
  calidad.tick();

  if (t - ultimoTablero > 120) { pintarTablero(r); pintarConclusion(); ultimoTablero = t; }
});
