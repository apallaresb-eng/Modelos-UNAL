// Revisa que cada modelo cumpla las reglas del repo (ver CLAUDE.md).
// Uso: node herramientas/validar.mjs [carpeta-del-modelo ...]
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarModelos } from './comun.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Recursos que el navegador intentaría descargar: rompen el modo sin internet.
const RECURSO_EXTERNO = /(?:<(?:script|link|img|source|video|audio|iframe)\b[^>]*?\b(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\/)|(?:url\(\s*["']?(?:https?:)?\/\/)|(?:@import\s+["'](?:https?:)?\/\/)|(?:\bimport\s*\(?\s*["']https?:\/\/)/i;
const SECCIONES_README = ['Fuente', 'Variables', 'Guion'];

export async function validar(carpeta) {
  const dir = path.resolve(carpeta);
  const errores = [];
  const avisos = [];
  const leer = async (n) => (existsSync(path.join(dir, n)) ? readFile(path.join(dir, n), 'utf8') : null);

  const [index, fuente, main, readme] = await Promise.all(['index.html', 'fuente.html', 'main.js', 'README.md'].map(leer));
  if (!fuente) errores.push('Falta fuente.html');
  if (!main) errores.push('Falta main.js');
  if (!index) errores.push('Falta index.html: corre "npm run empaquetar"');

  if (index) {
    const m = index.match(RECURSO_EXTERNO);
    if (m) errores.push(`index.html carga algo de internet (no funcionará offline): ${m[0].slice(0, 120)}`);
    const kb = Buffer.byteLength(index) / 1024;
    if (kb > 15 * 1024) avisos.push(`index.html pesa ${Math.round(kb / 1024)} MB; revisa texturas o modelos pesados.`);
  }
  if (fuente && !/<html[^>]+lang=["']es/.test(fuente)) avisos.push('fuente.html debería declarar lang="es".');
  if (main) {
    if (!/from\s+['"]@nucleo['"]/.test(main)) errores.push('main.js no usa el núcleo (@nucleo): faltarían calidad adaptativa, grabar y captura.');
    if (!/crearBarraHerramientas\s*\(/.test(main)) errores.push('main.js no crea la barra (casilla "Calidad alta", Grabar, Captura HD).');
    if (!/crearPanel\s*\(/.test(main)) avisos.push('main.js no tiene panel de variables; ¿el modelo es interactivo?');
    // Cada variable va desde "{ id:" hasta el siguiente "{ id:" (el símbolo LaTeX puede tener llaves).
    const trozos = main.split(/\{\s*id:\s*(?=['"])/).slice(1);
    for (const t of trozos) {
      const bloque = t.split(/\n\s*\]/)[0];
      if (/nombre:/.test(bloque) && !(/que:/.test(bloque) && /siSube:/.test(bloque))) {
        avisos.push(`Variable sin explicación "que"/"siSube": ${bloque.slice(0, 50)}…`);
      }
    }
    if (!/crearPrediccion\s*\(/.test(main)) avisos.push('Sin "Predice y verifica": considera agregar una pregunta al público.');
  }
  if (path.basename(dir) !== 'plantilla') {
    if (!readme) errores.push('Falta README.md (fuente científica, variables y guion de exposición).');
    else for (const s of SECCIONES_README) if (!new RegExp(`^#+\\s*${s}`, 'mi').test(readme)) errores.push(`README.md sin sección "${s}".`);
  }
  return { dir, errores, avisos };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const carpetas = process.argv.slice(2).length ? process.argv.slice(2) : buscarModelos(RAIZ);
  let total = 0;
  for (const c of carpetas) {
    const { dir, errores, avisos } = await validar(c);
    total += errores.length;
    console.log(`${errores.length ? '✗' : '✓'} ${path.relative(RAIZ, dir)}`);
    errores.forEach((e) => console.log(`   error: ${e}`));
    avisos.forEach((a) => console.log(`   aviso: ${a}`));
  }
  process.exit(total ? 1 : 0);
}
