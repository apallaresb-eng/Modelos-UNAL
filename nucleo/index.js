// Núcleo compartido de todos los modelos. Se empaqueta dentro de cada index.html.
// La identidad visual NO vive aquí: cada modelo define su propio estilo.css.
import 'katex/dist/katex.min.css';
import './base.css';

export { crearCalidad, aplicarCalidadRenderer, NIVELES } from './calidad.js';
export { crearPanel, formula } from './panel.js';
export { crearGrabadora, capturaHD } from './grabar.js';
export { crearPrediccion } from './predice.js';

// Barra con la casilla "Calidad alta" y los botones de grabar y captura.
export function crearBarraHerramientas(contenedor, { calidad, grabadora, alCapturar }) {
  contenedor.classList.add('barra-herramientas');
  contenedor.innerHTML = `
    <label class="casilla-calidad" title="Sombras suaves, post-procesado y más partículas. Puede ir lento en equipos básicos.">
      <input type="checkbox" data-calidad-alta> Calidad alta
    </label>
    <span class="indicador-calidad" aria-live="polite"></span>
    <button type="button" data-grabar>● Grabar</button>
    <button type="button" data-captura>Captura HD</button>`;
  const indicador = contenedor.querySelector('.indicador-calidad');
  contenedor.querySelector('[data-calidad-alta]').addEventListener('change', (e) => calidad.forzarAlta(e.target.checked));
  calidad.alCambiar((n) => { indicador.textContent = `calidad ${n.nombre}`; });

  const botonGrabar = contenedor.querySelector('[data-grabar]');
  if (!grabadora.disponible) botonGrabar.hidden = true;
  botonGrabar.addEventListener('click', () => {
    const grabando = grabadora.alternar();
    botonGrabar.textContent = grabando ? '■ Detener' : '● Grabar';
    botonGrabar.classList.toggle('activo', grabando);
  });
  contenedor.querySelector('[data-captura]').addEventListener('click', alCapturar);
}
