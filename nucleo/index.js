// Núcleo compartido de todos los modelos. Se empaqueta dentro de cada index.html.
// La identidad visual NO vive aquí: cada modelo define su propio estilo.css.
import 'katex/dist/katex.min.css';
import './base.css';

export { crearCalidad, aplicarCalidadRenderer, NIVELES } from './calidad.js';
export { crearPanel, formula } from './panel.js';
export { crearGrabadora, capturaHD } from './grabar.js';
export { crearPrediccion } from './predice.js';
export { crearRecorrido } from './recorrido.js';
export { crearIntro } from './intro.js';
export { crearEtiquetas } from './etiquetas.js';
export { crearAsa } from './manipular.js';
export { crearPostproceso } from './postproceso.js';

// Modo expo (tecla E): oculta paneles y deja solo la escena y el texto del paso.
// Pantalla completa: tecla F.
export function activarModoExpo(valor) {
  document.documentElement.classList.toggle('modo-expo', valor);
}

// Barra con la casilla "Calidad alta", modo expo, pantalla completa, grabar y captura.
export function crearBarraHerramientas(contenedor, { calidad, grabadora, alCapturar }) {
  contenedor.classList.add('barra-herramientas');
  contenedor.innerHTML = `
    <label class="casilla-calidad" title="Sombras suaves, post-procesado y más partículas. Puede ir lento en equipos básicos.">
      <input type="checkbox" data-calidad-alta> Calidad alta
    </label>
    <span class="indicador-calidad" aria-live="polite"></span>
    <button type="button" data-expo title="Oculta los paneles (tecla E)">Modo expo · E</button>
    <button type="button" data-completa title="Pantalla completa (tecla F)">⛶</button>
    <button type="button" data-grabar>● Grabar</button>
    <button type="button" data-captura>Captura HD</button>`;
  const indicador = contenedor.querySelector('.indicador-calidad');
  contenedor.querySelector('[data-calidad-alta]').addEventListener('change', (e) => calidad.forzarAlta(e.target.checked));
  calidad.alCambiar((n) => { indicador.textContent = `calidad ${n.nombre}`; });

  const alternarExpo = () => activarModoExpo(!document.documentElement.classList.contains('modo-expo'));
  const alternarCompleta = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  contenedor.querySelector('[data-expo]').addEventListener('click', alternarExpo);
  contenedor.querySelector('[data-completa]').addEventListener('click', alternarCompleta);
  addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey) return;
    if (e.key === 'e' || e.key === 'E') alternarExpo();
    if (e.key === 'f' || e.key === 'F') alternarCompleta();
  });

  const botonGrabar = contenedor.querySelector('[data-grabar]');
  if (!grabadora.disponible) botonGrabar.hidden = true;
  botonGrabar.addEventListener('click', () => {
    const grabando = grabadora.alternar();
    botonGrabar.textContent = grabando ? '■ Detener' : '● Grabar';
    botonGrabar.classList.toggle('activo', grabando);
  });
  contenedor.querySelector('[data-captura]').addEventListener('click', alCapturar);
  // Lo usa `npm run calificar`.
  Object.assign((window.__modelo ??= {}), { calidad, activarModoExpo });
}
