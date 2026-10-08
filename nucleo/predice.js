// "Predice y verifica": el público elige una respuesta y el modelo lo demuestra.

export function crearPrediccion(contenedor, { pregunta, opciones, correcta, explicacion, demostrar }) {
  const caja = document.createElement('section');
  caja.className = 'prediccion';
  caja.innerHTML = `
    <p class="prediccion__etiqueta">Predice y verifica</p>
    <h2 class="prediccion__pregunta">${pregunta}</h2>
    <div class="prediccion__opciones">
      ${opciones.map((o, i) => `<button type="button" data-i="${i}">${o}</button>`).join('')}
    </div>
    <p class="prediccion__resultado" hidden></p>`;
  const resultado = caja.querySelector('.prediccion__resultado');

  caja.querySelectorAll('button').forEach((b) => b.addEventListener('click', async () => {
    const elegida = Number(b.dataset.i);
    caja.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    b.classList.add('elegida');
    resultado.hidden = false;
    resultado.textContent = 'Veamos qué pasa…';
    if (demostrar) await demostrar();
    caja.querySelector(`[data-i="${correcta}"]`).classList.add('correcta');
    resultado.textContent = (elegida === correcta ? '¡Exacto! ' : 'No era esa. ') + explicacion;
  }));

  contenedor.appendChild(caja);
  return {
    reiniciar() {
      caja.querySelectorAll('button').forEach((x) => { x.disabled = false; x.classList.remove('elegida', 'correcta'); });
      resultado.hidden = true;
    },
  };
}
