import { readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

// Devuelve la plantilla y cada carpeta bajo modelos/ que tenga un fuente.html.
export function buscarModelos(raiz) {
  const encontrados = [path.join(raiz, 'plantilla')];
  const recorrer = (dir) => {
    if (!existsSync(dir)) return;
    if (existsSync(path.join(dir, 'fuente.html'))) { encontrados.push(dir); return; }
    for (const nombre of readdirSync(dir)) {
      const sub = path.join(dir, nombre);
      if (!nombre.startsWith('.') && statSync(sub).isDirectory()) recorrer(sub);
    }
  };
  recorrer(path.join(raiz, 'modelos'));
  return encontrados;
}

// Sube desde un archivo hasta encontrar la carpeta del modelo (la que tiene fuente.html).
export function carpetaDelModelo(archivo, raiz) {
  let dir = path.dirname(path.resolve(archivo));
  while (dir.startsWith(raiz) && dir !== raiz) {
    if (existsSync(path.join(dir, 'fuente.html'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}
