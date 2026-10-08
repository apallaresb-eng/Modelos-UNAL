// Botones para el informe: grabar video (.webm) y captura en alta resolución (.png).
// `capas`: funciones (ctx, ancho, alto) => void que se dibujan encima del canvas WebGL,
// por ejemplo etiquetas.dibujarEn, para que también salgan en el video y en la captura.

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const marcaDeTiempo = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

function componer(canvas, capas, destino) {
  const ctx = destino.getContext('2d');
  ctx.drawImage(canvas, 0, 0, destino.width, destino.height);
  for (const capa of capas) { ctx.save(); capa(ctx, destino.width, destino.height); ctx.restore(); }
}

export function crearGrabadora(canvas, { nombre = 'modelo', fps = 60, capas = [] } = {}) {
  let grabadora = null;
  let trozos = [];
  let bucle = 0;
  const tipo = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));

  return {
    get grabando() { return !!grabadora; },
    disponible: !!tipo,
    alternar() {
      if (grabadora) { grabadora.stop(); cancelAnimationFrame(bucle); return false; }
      trozos = [];
      let fuente = canvas;
      if (capas.length) {
        // Lienzo intermedio que junta la escena y las capas 2D en cada frame.
        fuente = Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height });
        const pintar = () => { componer(canvas, capas, fuente); bucle = requestAnimationFrame(pintar); };
        pintar();
      }
      grabadora = new MediaRecorder(fuente.captureStream(fps), { mimeType: tipo, videoBitsPerSecond: 12_000_000 });
      grabadora.ondataavailable = (e) => e.data.size && trozos.push(e.data);
      grabadora.onstop = () => {
        descargar(new Blob(trozos, { type: 'video/webm' }), `${nombre}-${marcaDeTiempo()}.webm`);
        grabadora = null;
      };
      grabadora.start(250);
      return true;
    },
  };
}

// renderizarA(ancho, alto) debe dibujar un frame al tamaño pedido; luego se restaura el tamaño normal.
export async function capturaHD(canvas, renderizarA, { nombre = 'modelo', ancho = 3840, alto = 2160, capas = [] } = {}) {
  const restaurar = renderizarA(ancho, alto);
  let fuente = canvas;
  if (capas.length) {
    fuente = Object.assign(document.createElement('canvas'), { width: ancho, height: alto });
    componer(canvas, capas, fuente);
  }
  const blob = await new Promise((ok) => fuente.toBlob(ok, 'image/png'));
  if (typeof restaurar === 'function') restaurar();
  descargar(blob, `${nombre}-${marcaDeTiempo()}.png`);
}
