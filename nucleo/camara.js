// Cámara web / celular con pantalla de permiso explicativa, espejo y respaldo.
// - abrirCamara({ frontal, video }) → { video, detener, origen } | lanza ErrorCamara
// - ?video=<url o data:> en la dirección (o la opción `video`) reemplaza la cámara por un archivo:
//   sirve para probar sin cámara y como "video de respaldo" en el salón.
// Nada sale del equipo: el video solo se procesa localmente.

export class ErrorCamara extends Error {
  constructor(motivo, mensaje) { super(mensaje); this.motivo = motivo; }
}

const MENSAJES = {
  NotAllowedError: ['permiso', 'Bloqueaste la cámara. Actívala desde el candado de la barra de direcciones y vuelve a intentar.'],
  NotFoundError: ['sin-camara', 'No encontramos ninguna cámara en este equipo.'],
  NotReadableError: ['ocupada', 'La cámara está siendo usada por otra aplicación (Zoom, Meet, Teams…). Ciérrala y reintenta.'],
  OverconstrainedError: ['sin-camara', 'Esta cámara no admite la configuración pedida.'],
  SecurityError: ['inseguro', 'El navegador no permite la cámara aquí. Ábrelo desde el link https o como archivo local.'],
};

export async function abrirCamara({ frontal = true, video: videoPrueba, ancho = 1280, alto = 720 } = {}) {
  const el = document.createElement('video');
  Object.assign(el, { muted: true, playsInline: true, autoplay: true });
  el.setAttribute('playsinline', '');
  const deUrl = new URLSearchParams(location.search).get('video');
  const archivo = videoPrueba ?? deUrl;
  if (archivo) {
    el.src = archivo;
    el.loop = true;
    await el.play();
    return { video: el, origen: 'archivo', espejo: false, detener: () => el.pause() };
  }
  if (!navigator.mediaDevices?.getUserMedia) throw new ErrorCamara('inseguro', MENSAJES.SecurityError[1]);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: frontal ? 'user' : 'environment', width: { ideal: ancho }, height: { ideal: alto }, frameRate: { ideal: 30 } },
    });
    el.srcObject = stream;
    await el.play();
    return { video: el, origen: 'camara', espejo: frontal, detener: () => stream.getTracks().forEach((t) => t.stop()) };
  } catch (e) {
    const [motivo, mensaje] = MENSAJES[e.name] ?? ['desconocido', `No se pudo abrir la cámara (${e.name}).`];
    throw new ErrorCamara(motivo, mensaje);
  }
}

// Pantalla previa: explica para qué es la cámara, la privacidad y ofrece el respaldo.
// Resuelve con 'camara', 'respaldo' (video de demostración) o 'sin-camara' (mouse/teclado).
export function pedirPermiso({ titulo, explicacion, conRespaldo = true }) {
  return new Promise((ok) => {
    const caja = document.createElement('div');
    caja.className = 'permiso-camara';
    caja.innerHTML = `
      <div class="permiso-camara__tarjeta" role="dialog" aria-modal="true" aria-labelledby="pc-titulo">
        <p class="permiso-camara__icono" aria-hidden="true">◉</p>
        <h2 id="pc-titulo">${titulo}</h2>
        <p>${explicacion}</p>
        <p class="permiso-camara__privacidad">🔒 Todo se procesa en tu equipo. Ninguna imagen sale de él ni se guarda.</p>
        <div class="permiso-camara__botones">
          <button type="button" data-r="camara" class="principal">Usar mi cámara</button>
          ${conRespaldo ? '<button type="button" data-r="respaldo">Ver con video de demostración</button>' : ''}
          <button type="button" data-r="sin-camara">Seguir con mouse y teclado</button>
        </div>
      </div>`;
    document.body.appendChild(caja);
    caja.querySelector('.principal').focus();
    caja.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]')?.dataset.r;
      if (!r) return;
      caja.remove();
      ok(r);
    });
  });
}

// Indicador permanente mientras la cámara está encendida (privacidad visible).
export function indicadorCamara(texto = 'Cámara activa · solo en tu equipo') {
  const el = document.createElement('div');
  el.className = 'indicador-camara';
  el.innerHTML = `<i></i>${texto}`;
  document.body.appendChild(el);
  return { quitar: () => el.remove(), texto: (t) => { el.lastChild.textContent = t; } };
}
