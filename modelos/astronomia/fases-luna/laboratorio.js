// Laboratorio "Hazlo en tu cuarto": lámpara = Sol, pelota = Luna, tu cabeza = Tierra.
// - Celular (recomendado): la cámara trasera mide la fracción iluminada k de la pelota y el giroscopio
//   mide, de forma INDEPENDIENTE, cuánto has girado (E). Se compara k medida con la teoría k = (1 − cos E)/2.
// - Portátil: medidor de fase (k → nombre de la fase y Luna 3D), sin ángulo independiente.
// - Video de respaldo: un recorrido grabado con E conocido en cada instante, por si falla la luz en el salón.
import { abrirCamara, indicadorCamara, ErrorCamara } from '@nucleo/camara.js';
import { crearSeguimiento } from '@nucleo/seguimiento.js';
import videoRespaldo from '@recursos/laboratorio-respaldo-fases.mp4';
import { fraccionIluminada, nombreFase } from './astro.js';

const RESPALDO = { E0: 40, E1: 320, duracion: 10 }; // el video recorre E de 40° a 320° en 10 s
const norm = (g) => ((g % 360) + 360) % 360;

export function abrirLaboratorio({ fijarE, estado }) {
  const caja = document.createElement('section');
  caja.className = 'laboratorio';
  caja.setAttribute('role', 'dialog');
  caja.innerHTML = `
    <div class="laboratorio__tarjeta">
      <header><p class="laboratorio__etiqueta">Laboratorio</p><h2>Mide las fases en tu cuarto</h2>
        <button type="button" class="laboratorio__cerrar" data-cerrar aria-label="Cerrar">✕</button></header>
      <ol class="laboratorio__montaje">
        <li><span>💡</span>Una lámpara sin pantalla, a la altura de tu cabeza. Apaga las demás luces.</li>
        <li><span>⚪</span>Una pelota clara en la mano, con el brazo estirado. Tu cabeza es la Tierra.</li>
        <li><span>🔄</span>Gira despacio sobre ti mismo: la cámara mide qué tanto de la pelota está iluminado.</li>
      </ol>
      <div class="laboratorio__modos">
        <button type="button" data-modo="celular" class="principal">📱 Con el celular (mide el giro)</button>
        <button type="button" data-modo="portatil">💻 Con la cámara del portátil</button>
        <button type="button" data-modo="respaldo">▶ Ver con el video de respaldo</button>
      </div>
      <div class="laboratorio__trabajo" hidden>
        <div class="laboratorio__vista"><canvas data-vista width="480" height="270"></canvas><p data-estado></p></div>
        <div class="laboratorio__datos">
          <p class="laboratorio__grande"><span data-medido>—</span><small>medido</small></p>
          <p class="laboratorio__grande teoria"><span data-teoria>—</span><small>teoría</small></p>
          <p data-fase class="laboratorio__fase"></p>
          <canvas data-grafica width="460" height="220"></canvas>
          <div class="laboratorio__botones">
            <button type="button" data-calibrar hidden>Calibrar: mira la lámpara</button>
            <button type="button" data-registrar>Registrar punto</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(caja);
  const $ = (s) => caja.querySelector(s);
  let detener = () => {};
  $('[data-cerrar]').addEventListener('click', () => { detener(); caja.remove(); });
  caja.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => iniciar(b.dataset.modo)));

  async function iniciar(modo) {
    detener();
    $('.laboratorio__modos').hidden = true; $('.laboratorio__montaje').hidden = modo === 'respaldo';
    $('.laboratorio__trabajo').hidden = false;
    let cam;
    try {
      cam = modo === 'respaldo' ? await abrirCamara({ video: videoRespaldo }) : await abrirCamara({ frontal: modo !== 'celular' });
    } catch (e) { $('[data-estado]').textContent = e instanceof ErrorCamara ? e.message : 'No se pudo abrir la cámara.'; return; }
    const indicador = modo === 'respaldo' ? null : indicadorCamara();
    // Ángulo independiente: giroscopio/brújula (celular) o el tiempo del video de respaldo.
    let alfa0 = null; let alfa = null;
    const alGirar = (e) => { if (e.alpha != null) alfa = e.alpha; };
    if (modo === 'celular') {
      addEventListener('deviceorientationabsolute', alGirar); addEventListener('deviceorientation', alGirar);
      $('[data-calibrar]').hidden = false;
      $('[data-calibrar]').addEventListener('click', () => { alfa0 = alfa; });
    }
    const anguloIndependiente = () => {
      if (modo === 'respaldo') return RESPALDO.E0 + (RESPALDO.E1 - RESPALDO.E0) * ((cam.video.currentTime % RESPALDO.duracion) / RESPALDO.duracion);
      if (modo === 'celular' && alfa0 != null && alfa != null) return norm(alfa - alfa0); // girar a la izquierda = creciente
      return null;
    };
    const puntos = [];
    let ultima = null;
    const seguimiento = crearSeguimiento({
      video: cam.video, espejo: cam.espejo,
      alMedir: (m) => {
        ultima = m;
        const E = anguloIndependiente();
        pintarVista(cam.video, m, cam.espejo);
        if (!m) { $('[data-estado]').textContent = 'No veo la pelota iluminada. Acércala a la lámpara o apaga otras luces.'; return; }
        const confiable = m.confiable;
        $('[data-estado]').textContent = confiable ? 'Midiendo…' : 'Fase muy delgada o borrosa: medición poco confiable';
        $('[data-medido]').textContent = `${m.kMedia.toFixed(2)} ± ${m.incertidumbre.toFixed(2)}`;
        $('[data-teoria]').textContent = E == null ? (modo === 'celular' ? 'calibra →' : '—') : fraccionIluminada(E).toFixed(2);
        const Efase = E ?? (m.luzDesde.x >= 0 ? 1 : -1) * Math.acos(Math.max(-1, Math.min(1, 1 - 2 * m.kMedia))) * 180 / Math.PI;
        $('[data-fase]').textContent = `${nombreFase(norm(Efase))}${confiable ? '' : ' (?)'}`;
        fijarE(norm(Efase), false); estado.pausa = true;
        if (modo === 'respaldo' && confiable && (!puntos.length || Math.abs(puntos[puntos.length - 1].E - E) > 6)) puntos.push({ E, k: m.kMedia, u: m.incertidumbre });
        pintarGrafica(puntos, E, m);
      },
    });
    $('[data-registrar]').addEventListener('click', () => {
      const E = anguloIndependiente();
      if (ultima && E != null) { puntos.push({ E, k: ultima.kMedia, u: ultima.incertidumbre }); pintarGrafica(puntos, E, ultima); }
    });
    detener = () => {
      seguimiento.detener(); cam.detener(); indicador?.quitar();
      removeEventListener('deviceorientationabsolute', alGirar); removeEventListener('deviceorientation', alGirar);
      estado.pausa = false;
    };
  }

  function pintarVista(video, m, espejo) {
    const c = $('[data-vista]'); const g = c.getContext('2d');
    g.save(); if (espejo) { g.translate(c.width, 0); g.scale(-1, 1); } g.drawImage(video, 0, 0, c.width, c.height); g.restore();
    if (!m) return;
    const s = c.width / m.ancho;
    g.strokeStyle = m.confiable ? '#7cf0c8' : '#ffb35c'; g.lineWidth = 2;
    g.beginPath(); g.arc(m.centro.x * s, m.centro.y * s, m.radio * s, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(m.centro.x * s, m.centro.y * s); g.lineTo((m.centro.x + m.luzDesde.x * m.radio * 1.4) * s, (m.centro.y + m.luzDesde.y * m.radio * 1.4) * s); g.stroke();
  }

  function pintarGrafica(puntos, Eactual, m) {
    const c = $('[data-grafica]'); const g = c.getContext('2d');
    const W = c.width; const H = c.height; const px = (E) => 36 + (E / 360) * (W - 50); const py = (k) => H - 26 - k * (H - 44);
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.15)'; g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '11px "JetBrains Mono", monospace';
    for (const E of [0, 90, 180, 270, 360]) { g.beginPath(); g.moveTo(px(E), py(0)); g.lineTo(px(E), py(1)); g.stroke(); g.fillText(`${E}°`, px(E) - 10, H - 8); }
    for (const k of [0, 0.5, 1]) g.fillText(k.toFixed(1), 4, py(k) + 4);
    g.strokeStyle = '#ffd27a'; g.lineWidth = 2; g.beginPath();
    for (let E = 0; E <= 360; E += 3) { const y = py(fraccionIluminada(E)); E ? g.lineTo(px(E), y) : g.moveTo(px(E), y); }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('teoría  k = (1 − cos E) / 2', px(200), py(1) - 4);
    for (const p of puntos) { g.strokeStyle = '#7cf0c8'; g.beginPath(); g.moveTo(px(p.E), py(p.k - p.u)); g.lineTo(px(p.E), py(p.k + p.u)); g.stroke(); g.fillStyle = '#7cf0c8'; g.beginPath(); g.arc(px(p.E), py(p.k), 3.5, 0, Math.PI * 2); g.fill(); }
    if (Eactual != null && m) { g.fillStyle = '#fff'; g.beginPath(); g.arc(px(Eactual), py(m.kMedia), 5, 0, Math.PI * 2); g.fill(); }
  }
  (window.__modelo ??= {}).laboratorio = { iniciar };
}
