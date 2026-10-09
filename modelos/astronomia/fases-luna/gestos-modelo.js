// Gestos del modelo de Fases de la Luna. Todo tiene respaldo con mouse y teclado en main.js.
// Base: mano abierta = mover la Luna · puño = pausa · pulgar al lado = paso anterior/siguiente.
// Contexto (por paso): pellizco = vista desde Bogotá · V girando = pasan los días · 👍 = responder ·
// aplaudir = sombra de la Tierra · dos pellizcos = zoom · dos puños (volante) = girar el sistema.
import * as THREE from 'three';
import { abrirCamara, pedirPermiso, indicadorCamara, ErrorCamara } from '@nucleo/camara.js';
import { iniciarGestos } from '@nucleo/gestos.js';

const rayo = new THREE.Raycaster();
const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const punto = new THREE.Vector3();

export async function activarGestos({ camara, controles, recorrido, acciones }) {
  const eleccion = await pedirPermiso({
    titulo: 'Controla la Luna con tus manos',
    explicacion: 'La cámara detecta tu mano para mover la Luna, pasar de paso y cambiar de vista. Ponte a un metro, con luz de frente.',
    conRespaldo: false,
  });
  if (eleccion !== 'camara') return null;
  let cam;
  try { cam = await abrirCamara({ frontal: true }); }
  catch (e) { avisar(e instanceof ErrorCamara ? e.message : 'No se pudo abrir la cámara.'); return null; }
  const indicador = indicadorCamara();
  const aviso = document.createElement('div');
  aviso.className = 'cargando-gestos';
  document.body.appendChild(aviso);
  const { estado, fijarE, alternarVista, alternarSombra, confirmarPrediccion, pausa } = acciones;

  const g = await iniciarGestos({
    video: cam.video, espejo: cam.espejo,
    alProgreso: (t) => { aviso.textContent = t; aviso.hidden = !t; },
    alEvento: (nombre, d) => {
      if (nombre === 'mover') {
        // La mano es un puntero: su posición en pantalla se proyecta sobre el plano de la órbita.
        if (estado.vistaTierra) { fijarE(d.x * 360, false); return; }
        rayo.setFromCamera(new THREE.Vector2(d.x * 2 - 1, -(d.y * 2 - 1)), camara);
        if (rayo.ray.intersectPlane(plano, punto)) fijarE(THREE.MathUtils.radToDeg(Math.atan2(-punto.z, punto.x)) - estado.lonSol, false);
      }
      if (nombre === 'pausa') pausa();
      if (nombre === 'navegar') recorrido.paso + d.dir >= recorrido.total ? recorrido.modoLibre() : recorrido.ir(recorrido.paso + d.dir);
      if (nombre === 'alternar') alternarVista();
      if (nombre === 'perilla') { estado.pausa = true; fijarE(estado.E + THREE.MathUtils.radToDeg(d.delta) * 2.5, false); }
      if (nombre === 'confirmar') confirmarPrediccion();
      if (nombre === 'aplauso') alternarSombra();
      if (nombre === 'zoom') { const v = camara.position.clone().sub(controles.target); v.multiplyScalar(1 / d.factor); if (v.length() > controles.minDistance && v.length() < controles.maxDistance) camara.position.copy(controles.target).add(v); }
      if (nombre === 'volante') camara.position.sub(controles.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), d.delta).add(controles.target);
    },
  });
  aviso.remove();
  const api = {
    activar: (ctx) => g.activar(ctx),
    detener: () => { g.detener(); cam.detener(); indicador.quitar(); },
    stats: g.stats,
  };
  return api;
}

function avisar(texto) {
  const a = document.createElement('div');
  a.className = 'aviso-flotante';
  a.textContent = texto;
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 6000);
}
