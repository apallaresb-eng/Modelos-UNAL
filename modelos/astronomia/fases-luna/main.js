// Fases de la Luna — modelo con recorrido 3D, control por gestos y laboratorio con cámara.
// ?heroe=1 → cuadro héroe sin interfaz (para la calificación de acabado y composición).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import '@fontsource/manrope/latin-300.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import {
  crearCalidad, aplicarCalidadRenderer, crearPanel, formula, crearGrabadora, capturaHD,
  crearPrediccion, crearBarraHerramientas, crearRecorrido, crearIntro, crearEtiquetas, crearAsa, crearPostproceso,
} from '@nucleo';
import { crearTierra, crearLuna, crearSol, crearEstrellas, crearSombra, crearViaLactea, ESCALA } from './escena.js';
import { fraccionIluminada, nombreFase, latitudLuna, hayEclipseLunar, lunaEnFecha, edadDias, MES_SINODICO, INCLINACION_ORBITA, BOGOTA } from './astro.js';
import { activarGestos } from './gestos-modelo.js';
import { abrirLaboratorio } from './laboratorio.js';
import './estilo.css';

gsap.ticker.lagSmoothing(0);
const HEROE = new URLSearchParams(location.search).has('heroe');
const rad = THREE.MathUtils.degToRad;
const norm = (g) => ((g % 360) + 360) % 360;

// ---------- Estado ----------
export const estado = {
  E: 50, // edad angular de la Luna (0 nueva, 180 llena)
  lonSol: 0, // longitud eclíptica del Sol (grados)
  nodo: 20, // longitud del nodo ascendente
  exageracion: 1, // inclinación de la órbita ×
  diasPorSegundo: 0.6,
  pausa: false,
  vistaTierra: false,
  sombra: false,
  fantasmas: false,
  escalaReal: false,
};

// ---------- Renderer, cámara y escena ----------
const canvas = document.querySelector('canvas.escena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x020306);
const camara = new THREE.PerspectiveCamera(34, 1, 0.05, 4000);
const camaraCielo = new THREE.PerspectiveCamera(9, 1, 0.0005, 4000); // ojo de un observador en Bogotá (prismáticos)
const controles = new OrbitControls(camara, canvas);
Object.assign(controles, { enableDamping: true, dampingFactor: 0.06, minDistance: 2.5, maxDistance: 140, rotateSpeed: 0.6 });

const uniformesSol = { dirSol: { value: new THREE.Vector3(1, 0, 0) } };
const { grupo: grupoTierra, tierra, nubes, eje } = crearTierra(uniformesSol);
const { luna, uniformes: uLuna } = crearLuna(uniformesSol);
const sol = crearSol();
const estrellas = crearEstrellas();
const sombra = crearSombra();
const viaLactea = crearViaLactea(uniformesSol);
escena.add(viaLactea, grupoTierra, luna, sol, estrellas, sombra);

// Órbita (línea) y línea de los nodos
const orbita = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.22 }));
const lineaNodos = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x7cf0c8, dashSize: 0.5, gapSize: 0.4, transparent: true, opacity: 0 }));
escena.add(orbita, lineaNodos);
// Fantasmas: la Luna en 8 posiciones (paso 1)
const fantasmas = [0, 45, 90, 135, 180, 225, 270, 315].map(() => { const m = luna.clone(); m.scale.setScalar(0.75); m.visible = false; escena.add(m); return m; });

function posicionLuna(E, distancia = estado.escalaReal ? ESCALA.distanciaLunaReal : ESCALA.distanciaLuna) {
  const lon = estado.lonSol + E;
  const beta = latitudLuna(lon, estado.nodo, INCLINACION_ORBITA * estado.exageracion);
  const l = rad(lon); const b = rad(beta);
  return { p: new THREE.Vector3(Math.cos(b) * Math.cos(l), Math.sin(b), -Math.cos(b) * Math.sin(l)).multiplyScalar(distancia), beta };
}
function orientarLuna(m) { // rotación sincrónica: siempre la misma cara hacia la Tierra
  m.lookAt(0, 0, 0);
  m.rotateY(-Math.PI / 2);
}
function actualizarOrbita() {
  const pts = [];
  for (let g = 0; g <= 360; g += 2) pts.push(posicionLuna(g - estado.lonSol + estado.lonSol, undefined).p);
  orbita.geometry.setFromPoints(pts);
  const n = rad(estado.nodo); const D = (estado.escalaReal ? ESCALA.distanciaLunaReal : ESCALA.distanciaLuna) * 1.25;
  lineaNodos.geometry.setFromPoints([new THREE.Vector3(Math.cos(n), 0, -Math.sin(n)).multiplyScalar(-D), new THREE.Vector3(Math.cos(n), 0, -Math.sin(n)).multiplyScalar(D)]);
  lineaNodos.computeLineDistances();
}

let betaActual = 0;
function actualizarEscena(dt) {
  const s = rad(estado.lonSol);
  uniformesSol.dirSol.value.set(Math.cos(s), 0, -Math.sin(s));
  sol.position.copy(uniformesSol.dirSol.value).multiplyScalar(1100);
  const { p, beta } = posicionLuna(estado.E);
  betaActual = beta;
  luna.position.copy(p);
  orientarLuna(luna);
  fantasmas.forEach((f, i) => { f.visible = estado.fantasmas; if (f.visible) { f.position.copy(posicionLuna(i * 45).p); orientarLuna(f); } });
  sombra.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), uniformesSol.dirSol.value.clone().negate());
  uLuna.sombraTierra.value = 1;
  tierra.rotation.y += dt * estado.diasPorSegundo * Math.PI * 2 * (estado.pausa ? 0 : 1) * 0.15;
  nubes.rotation.y += dt * 0.004;
  actualizarOrbita();
}

// ---------- Vista desde Bogotá: cámara sobre la superficie mirando la Luna, "arriba" = cénit ----------
const zenit = new THREE.Vector3();
function colocarObservador() {
  // Busca, sobre el paralelo de Bogotá (en la Tierra con su eje inclinado), el punto desde donde la
  // Luna se ve a ~30° de altura: al oeste al atardecer (creciente) o al este de madrugada (menguante).
  const lunaDir = luna.position.clone().normalize();
  const ejeTierra = new THREE.Vector3(0, 1, 0).applyQuaternion(eje.getWorldQuaternion(new THREE.Quaternion()));
  const ref = new THREE.Vector3(1, 0, 0).applyQuaternion(eje.getWorldQuaternion(new THREE.Quaternion()));
  const ref2 = new THREE.Vector3().crossVectors(ejeTierra, ref);
  const lat = rad(BOGOTA.latitud);
  const crece = norm(estado.E) < 180;
  let mejor = null;
  for (let g = 0; g < 360; g += 1) {
    const L = rad(g);
    const q = ejeTierra.clone().multiplyScalar(Math.sin(lat)).add(ref.clone().multiplyScalar(Math.cos(lat) * Math.cos(L))).add(ref2.clone().multiplyScalar(Math.cos(lat) * Math.sin(L)));
    const alt = 90 - THREE.MathUtils.radToDeg(q.angleTo(lunaDir));
    const este = new THREE.Vector3().crossVectors(ejeTierra, q).normalize();
    const alOeste = lunaDir.dot(este) < 0;
    const puntaje = Math.abs(alt - 30) + (alOeste === crece ? 0 : 60);
    if (!mejor || puntaje < mejor.puntaje) mejor = { q, puntaje };
  }
  zenit.copy(mejor.q);
  camaraCielo.position.copy(mejor.q).multiplyScalar(1.0004);
  camaraCielo.up.copy(zenit);
  camaraCielo.lookAt(luna.position);
}

// ---------- Etiquetas ----------
const etiquetas = crearEtiquetas(camara, canvas, { fuente: 'Manrope, system-ui, sans-serif', fondo: 'rgba(6,8,14,0.78)', borde: 'rgba(255,255,255,0.25)' });
const etiLuna = etiquetas.agregar({ texto: '', color: '#e9ecf4', ancla: () => luna.position, lado: 'derecha', prioridad: 3 });
const etiTierra = etiquetas.agregar({ texto: 'Tierra', color: '#8ec5ff', ancla: () => new THREE.Vector3(0, 1.15, 0), lado: 'arriba', prioridad: 2 });
const etiSol = etiquetas.agregar({ texto: '☀ luz del Sol', color: '#ffd27a', ancla: () => uniformesSol.dirSol.value.clone().multiplyScalar(18), lado: 'arriba', prioridad: 1 });
const etiSombra = etiquetas.agregar({ texto: 'sombra de la Tierra', color: '#ff7d8c', ancla: () => uniformesSol.dirSol.value.clone().multiplyScalar(-11), lado: 'abajo', visible: false });

// ---------- Manipulación directa: arrastrar la Luna por su órbita ----------
crearAsa({
  objeto: luna, camara, dom: canvas, controles,
  plano: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
  alEmpezar: () => { estado.pausa = true; },
  alArrastrar: (pt) => { fijarE(THREE.MathUtils.radToDeg(Math.atan2(-pt.z, pt.x)) - estado.lonSol, false); },
  alSoltar: () => { estado.pausa = pausaUsuario; },
});
let pausaUsuario = false;
if (!HEROE) { estado.E = 90; estado.nodo = 90; }
export function fijarE(E, animar = true) {
  const destino = norm(E);
  if (!animar) { estado.E = destino; return; }
  let d = destino - estado.E; if (d > 180) d -= 360; if (d < -180) d += 360;
  gsap.to(estado, { E: estado.E + d, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { estado.E = norm(estado.E); } });
}
export function alternarVista(valor = !estado.vistaTierra) { estado.vistaTierra = valor; fundido(); document.documentElement.classList.toggle('vista-cielo', valor); }
export function alternarSombra(valor = !estado.sombra) {
  estado.sombra = valor;
  gsap.to(sombra.material.uniforms.opacidad, { value: valor ? 1 : 0, duration: 0.8 });
  etiSombra.visible = valor;
}
function fundido() { const v = document.querySelector('.fundido'); gsap.fromTo(v, { opacity: 1 }, { opacity: 0, duration: 0.7, ease: 'power2.out' }); }

// ---------- Interfaz ----------
const lectura = document.querySelector('[data-lectura]');
function pintarLectura() {
  const k = fraccionIluminada(estado.E);
  const eclipse = hayEclipseLunar(estado.E, betaActual);
  lectura.innerHTML = `<span class="lectura__fase">${eclipse ? 'Eclipse lunar' : nombreFase(estado.E)}</span>
    <span class="lectura__dato">${(k * 100).toFixed(0)} % iluminada · día ${edadDias(estado.E).toFixed(1)} de ${MES_SINODICO.toFixed(1)}</span>`;
  etiLuna.texto = estado.vistaTierra ? '' : `${nombreFase(estado.E)} · ${(k * 100).toFixed(0)} %`;
}

formula(document.querySelector('[data-ecuacion]'), String.raw`k = \frac{1 - \cos E}{2}\qquad T_{\text{sin}} = 29{,}53\ \text{d}`);
const panel = crearPanel(document.querySelector('[data-variables]'), [
  { id: 'E', nombre: 'Posición de la Luna', simbolo: 'E', unidad: '°', min: 0, max: 359, paso: 1, valor: estado.E,
    que: 'Ángulo entre la Luna y el Sol visto desde la Tierra (elongación). 0° = nueva, 180° = llena.', siSube: 'La Luna avanza en su órbita y se ilumina más hasta la llena; después mengua.' },
  { id: 'dias', nombre: 'Velocidad del tiempo', simbolo: '\\Delta t', unidad: 'días/s', min: 0, max: 6, paso: 0.1, valor: estado.diasPorSegundo,
    que: 'Cuántos días pasan por cada segundo real.', siSube: 'Ves pasar el mes más rápido: un ciclo completo dura 29,5 días.' },
  { id: 'incl', nombre: 'Exagerar inclinación', simbolo: '\\times i', unidad: '', min: 1, max: 6, paso: 0.5, valor: 1,
    que: 'La órbita real está inclinada 5,1° respecto a la de la Tierra. Aquí puedes exagerarla para verla.', siSube: 'Se nota que la Luna pasa por encima o por debajo de la sombra: por eso no hay eclipses cada mes.' },
], (v, id) => {
  if (id === 'E') fijarE(v.E, false);
  estado.diasPorSegundo = v.dias; estado.exageracion = v.incl;
});

// Predice y verifica (con el mouse o con gestos: pones la Luna donde crees y confirmas 👍)
let esperandoPrediccion = false;
const prediccion = crearPrediccion(document.querySelector('[data-prediccion]'), {
  pregunta: '¿Dónde debe estar la Luna para verla en cuarto creciente?',
  opciones: ['Entre la Tierra y el Sol', 'Formando una "L" con el Sol (90°)', 'Detrás de la Tierra'],
  correcta: 1,
  explicacion: 'A 90° del Sol ves exactamente la mitad de su cara iluminada.',
  demostrar: () => new Promise((ok) => { alternarVista(false); fijarE(90); setTimeout(ok, 1600); }),
});
export function confirmarPrediccion() {
  if (!esperandoPrediccion) return;
  const e = norm(estado.E);
  const i = e < 45 || e > 315 ? 0 : Math.abs(e - 90) < 30 ? 1 : 2;
  document.querySelectorAll('.prediccion__opciones button')[i]?.click();
}

// ---------- Recorrido (≤ 25 palabras por paso) ----------
let gestos = null;
const contextos = (c) => gestos?.activar(c);
const recorrido = crearRecorrido({
  camara, controles,
  pasos: [
    { titulo: 'La mitad siempre está iluminada', texto: 'El Sol ilumina siempre media Luna. Arrastra la Luna por su órbita con el mouse o con tu mano abierta.',
      camara: { pos: [0.01, 34, 4], mirar: [0, 0, 0] },
      entrar: () => { estado.fantasmas = true; alternarVista(false); alternarSombra(false); contextos([]); }, salir: () => { estado.fantasmas = false; } },
    { titulo: 'Lo que ves desde Bogotá', texto: 'Desde la Tierra solo ves la parte iluminada que mira hacia ti. Pellizca o pulsa V para cambiar de vista.',
      camara: { pos: [6, 3, 16], mirar: [0, 0, 0] },
      entrar: () => { alternarVista(true); fijarE(50); contextos(['vista', 'tiempo']); } },
    { titulo: 'Predice', texto: 'Pon la Luna donde la verías en cuarto creciente y confirma con 👍 o eligiendo a la derecha.',
      camara: { pos: [0.01, 30, 6], mirar: [0, 0, 0] },
      entrar: () => { alternarVista(false); esperandoPrediccion = true; prediccion.reiniciar(); fijarE(330); contextos(['responder']); }, salir: () => { esperandoPrediccion = false; } },
    { titulo: 'No es la sombra de la Tierra', texto: 'La sombra de la Tierra apunta lejos del Sol. Solo la toca en luna llena… y eso es un eclipse.',
      camara: { pos: [-4, 9, 24], mirar: [-4, 0, 0] },
      entrar: () => { alternarVista(false); estado.nodo = norm(estado.lonSol + 180); alternarSombra(true); fijarE(90); setTimeout(() => recorrido.paso === 3 && fijarE(180), 2600); contextos(['sombra']); } },
    { titulo: '¿Por qué no hay eclipse cada mes?', texto: 'La órbita de la Luna está inclinada 5°: casi siempre pasa por encima o por debajo de la sombra.',
      camara: { pos: [26, 2.5, 10], mirar: [0, 0, 0] },
      entrar: () => { alternarVista(false); estado.nodo = norm(estado.lonSol + 60); panel.fijar('incl', 4); lineaNodos.material.opacity = 0.8; panel.fijar('dias', 3); contextos(['zoom', 'rotar']); },
      salir: () => { lineaNodos.material.opacity = 0; panel.fijar('incl', 1); panel.fijar('dias', 0.6); } },
    { titulo: 'La Luna de hoy', texto: '', camara: { pos: [6, 3, 16], mirar: [0, 0, 0] },
      entrar: () => { const h = lunaEnFecha(new Date()); estado.pausa = true; fijarE(h.E); alternarVista(true); pintarHoy(h); contextos(['vista']); },
      salir: () => { estado.pausa = pausaUsuario; } },
    { titulo: 'Hazlo en tu cuarto', texto: 'Con una pelota, una lámpara y tu celular puedes medir tú mismo las fases. <button type="button" class="enlace" data-abrir-lab>Abrir laboratorio →</button>',
      camara: { pos: [10, 6, 22], mirar: [0, 0, 0] }, entrar: () => { alternarVista(false); contextos([]); } },
  ],
  alModoLibre: () => { alternarVista(false); contextos(['vista', 'tiempo', 'sombra']); },
});
function pintarHoy(h) {
  const fmt = (d) => d?.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  document.querySelector('.recorrido__texto').innerHTML = `Ahora sobre Bogotá: <b>${h.nombre}</b>, ${(h.k * 100).toFixed(0)} % iluminada. Próxima llena: ${fmt(h.siguienteLlena)}.`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-abrir-lab]')) abrirLaboratorio({ fijarE, estado }); });

// Teclado (respaldo de los gestos)
addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === ' ') { e.preventDefault(); pausaUsuario = !pausaUsuario; estado.pausa = pausaUsuario; }
  if (e.key === 'v' || e.key === 'V') alternarVista();
  if (e.key === 's' || e.key === 'S') alternarSombra();
  if (e.key === '+') fijarE(estado.E + 12); if (e.key === '-') fijarE(estado.E - 12);
});

// ---------- Gestos (botón en la barra) ----------
document.querySelector('[data-usar-gestos]').addEventListener('click', async () => {
  gestos = await activarGestos({
    camara, controles, luna, recorrido,
    acciones: { fijarE, alternarVista, alternarSombra, confirmarPrediccion, pausa: () => { pausaUsuario = !pausaUsuario; estado.pausa = pausaUsuario; }, estado },
  });
  if (gestos) recorrido.paso >= 0 && recorrido.ir(recorrido.paso);
});

// ---------- Post-procesado, calidad, herramientas ----------
const post = crearPostproceso(renderer, escena, camara, {
  bloom: { intensity: 1.15, luminanceThreshold: 0.93, luminanceSmoothing: 0.2, mipmapBlur: true, radius: 0.75 },
  vineta: { offset: 0.3, darkness: 0.75 }, ao: null,
  gradacion: { sombras: [0.0, 0.0006, 0.0022], luces: [1.04, 1.0, 0.95], grano: 0.006 }, // negros de observatorio, luz solar cálida
});
const calidad = crearCalidad({ inicial: 'alta' });
calidad.alCambiar((nivel) => {
  aplicarCalidadRenderer(renderer, nivel); post.aplicarNivel(nivel);
  estrellas.material.uniforms.escalaPx.value = renderer.getPixelRatio();
});
function ajustarTamano(w = innerWidth, h = innerHeight) {
  renderer.setSize(w, h, false); post.setSize(w, h);
  for (const c of [camara, camaraCielo]) { c.aspect = w / h; c.updateProjectionMatrix(); }
}
addEventListener('resize', () => ajustarTamano());
ajustarTamano();
const capas = [(ctx, w, h) => etiquetas.dibujarEn(ctx, w, h)];
crearBarraHerramientas(document.querySelector('[data-herramientas]'), {
  calidad, grabadora: crearGrabadora(canvas, { nombre: 'fases-luna', capas }),
  alCapturar: () => capturaHD(canvas, (w, h) => { const pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); ajustarTamano(w, h); post.render(0); return () => { renderer.setPixelRatio(pr); ajustarTamano(); }; }, { nombre: 'fases-luna', capas }),
});

// ---------- Intro o cuadro héroe ----------
// Cuadro héroe: cámara detrás de la Luna (lado opuesto al Sol) → creciente con sombras de cráteres en primer plano
// y la Tierra a media fase al fondo, con las luces de las ciudades. Encuadre calculado (Luna a la izquierda).
const HERO = { pos: [-0.637, 0.285, -15.915], mirar: [1.199, -0.522, -6.628], fov: 20 }; // Luna ≈ 820 px, Tierra ≈ 390 px a 1080p
if (HEROE) {
  document.documentElement.classList.add('heroe');
  estado.E = 90; estado.nodo = 90; estado.pausa = true; orbita.visible = false; // nodo en la Luna → latitud 0
  camara.position.set(...HERO.pos); controles.target.set(...HERO.mirar);
  camara.fov = HERO.fov; camara.updateProjectionMatrix(); calidad.forzarAlta(true);
} else {
  crearIntro({
    camara, controles, titulo: '¿Por qué cambia la Luna?', subtitulo: 'Astronomía · Fases lunares', duracion: 5,
    desde: { pos: [-22, 9, -48], mirar: [0, 0, -10] }, hasta: { pos: HERO.pos, mirar: HERO.mirar },
    alTerminar: () => recorrido.ir(0),
  });
}

// La vista desde Bogotá usa otra cámara: se cambia en el post-procesado (y se ocultan las etiquetas 3D).
let camaraActiva = camara;
function usarCamara(c) {
  if (c === camaraActiva) return;
  camaraActiva = c;
  post.composer.setMainCamera(c);
  etiquetas.capa.style.opacity = c === camara ? '1' : '0';
}

// ---------- Bucle ----------
const reloj = new THREE.Clock();
let ultimaLectura = 0;
renderer.setAnimationLoop((t) => {
  const dt = Math.min(reloj.getDelta(), 1 / 20);
  if (!estado.pausa) estado.E = norm(estado.E + dt * estado.diasPorSegundo * (360 / MES_SINODICO));
  actualizarEscena(dt);
  if (estado.vistaTierra) colocarObservador();
  usarCamara(estado.vistaTierra ? camaraCielo : camara);
  controles.update();
  post.render(dt);
  etiquetas.actualizar();
  calidad.tick();
  if (t - ultimaLectura > 150) { pintarLectura(); ultimaLectura = t; }
});
(window.__modelo ??= {}).estado = estado;
