// Panel de variables: cada variable tiene símbolo, unidad, "qué es" y "qué pasa si la subes".
import katex from 'katex';

export function formula(elemento, tex, { bloque = true } = {}) {
  katex.render(tex, elemento, { displayMode: bloque, throwOnError: false });
}

/**
 * @param {HTMLElement} contenedor
 * @param {Array<{id:string,nombre:string,simbolo:string,unidad?:string,min:number,max:number,paso:number,valor:number,que:string,siSube:string}>} variables
 * @param {(valores:Record<string,number>, id:string)=>void} alCambiar
 */
export function crearPanel(contenedor, variables, alCambiar) {
  const valores = Object.fromEntries(variables.map((v) => [v.id, v.valor]));
  const entradas = {};
  contenedor.classList.add('panel-variables');

  for (const v of variables) {
    const fila = document.createElement('div');
    fila.className = 'variable';
    fila.innerHTML = `
      <div class="variable__cabecera">
        <span class="variable__simbolo"></span>
        <span class="variable__nombre">${v.nombre}</span>
        <button class="variable__info" type="button" aria-expanded="false" aria-label="¿Qué es ${v.nombre}?">?</button>
        <output class="variable__valor"></output>
      </div>
      <input type="range" min="${v.min}" max="${v.max}" step="${v.paso}" value="${v.valor}" aria-label="${v.nombre}">
      <div class="variable__ayuda" hidden>
        <p><strong>Qué es:</strong> ${v.que}</p>
        <p><strong>Si la subes:</strong> ${v.siSube}</p>
      </div>`;
    formula(fila.querySelector('.variable__simbolo'), v.simbolo, { bloque: false });

    const entrada = fila.querySelector('input');
    entradas[v.id] = entrada;
    const salida = fila.querySelector('output');
    const info = fila.querySelector('.variable__info');
    const ayuda = fila.querySelector('.variable__ayuda');
    const decimales = Math.max(0, -Math.floor(Math.log10(v.paso)));
    const pintar = () => { salida.textContent = `${valores[v.id].toFixed(decimales)}${v.unidad ? ' ' + v.unidad : ''}`; };

    entrada.addEventListener('input', () => {
      valores[v.id] = Number(entrada.value);
      pintar();
      alCambiar({ ...valores }, v.id);
    });
    info.addEventListener('click', () => {
      ayuda.hidden = !ayuda.hidden;
      info.setAttribute('aria-expanded', String(!ayuda.hidden));
    });
    pintar();
    contenedor.appendChild(fila);
  }

  return {
    valores: () => ({ ...valores }),
    fijar(id, valor) {
      const entrada = entradas[id];
      if (!entrada) return;
      entrada.value = valor;
      entrada.dispatchEvent(new Event('input'));
    },
  };
}
