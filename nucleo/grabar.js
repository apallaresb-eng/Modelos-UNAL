// Botones para el informe: grabar video del canvas (.webm) y captura en alta resolución (.png).

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const marcaDeTiempo = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

export function crearGrabadora(canvas, { nombre = 'modelo', fps = 60 } = {}) {
  let grabadora = null;
  let trozos = [];
  const tipo = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));

  return {
    get grabando() { return !!grabadora; },
    disponible: !!tipo,
    alternar() {
      if (grabadora) { grabadora.stop(); return false; }
      trozos = [];
      grabadora = new MediaRecorder(canvas.captureStream(fps), { mimeType: tipo, videoBitsPerSecond: 12_000_000 });
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
export async function capturaHD(canvas, renderizarA, { nombre = 'modelo', ancho = 3840, alto = 2160 } = {}) {
  const restaurar = renderizarA(ancho, alto);
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
  if (typeof restaurar === 'function') restaurar();
  descargar(blob, `${nombre}-${marcaDeTiempo()}.png`);
}
