// Convierte fuente.html + main.js + estilo.css de un modelo en UN index.html autocontenido
// (JS, CSS, fuentes e imágenes incrustados) que funciona sin internet con doble clic.
//
// Uso: node herramientas/empaquetar.mjs [carpeta-del-modelo ...]
//      sin argumentos empaqueta la plantilla y todos los modelos.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarModelos } from './comun.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// KaTeX trae cada fuente en woff2, woff y ttf; los navegadores actuales solo usan woff2.
const katexSoloWoff2 = {
  name: 'katex-solo-woff2',
  setup(b) {
    b.onLoad({ filter: /katex(\.min)?\.css$/ }, async (args) => ({
      contents: (await readFile(args.path, 'utf8')).replace(/,url\([^)]+\.(?:woff|ttf)\) format\("(?:woff|truetype)"\)/g, ''),
      loader: 'css',
      resolveDir: path.dirname(args.path),
    }));
  },
};

export async function empaquetar(carpeta) {
  const dir = path.resolve(carpeta);
  const fuente = path.join(dir, 'fuente.html');
  const entrada = path.join(dir, 'main.js');
  if (!existsSync(fuente) || !existsSync(entrada)) throw new Error(`${dir}: faltan fuente.html o main.js`);

  const resultado = await build({
    entryPoints: [entrada],
    bundle: true,
    write: false,
    minify: true,
    format: 'iife',
    target: 'es2020',
    outdir: path.join(dir, '.salida'),
    alias: { '@nucleo': path.join(RAIZ, 'nucleo/index.js') },
    loader: {
      '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl',
      '.png': 'dataurl', '.jpg': 'dataurl', '.webp': 'dataurl', '.svg': 'dataurl',
      '.glb': 'dataurl', '.hdr': 'dataurl', '.task': 'dataurl', '.wasm': 'dataurl',
      '.mp3': 'dataurl', '.ogg': 'dataurl', '.csv': 'text', '.glsl': 'text', '.vert': 'text', '.frag': 'text',
    },
    plugins: [katexSoloWoff2],
    logLevel: 'silent',
  });

  const js = resultado.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? '';
  const css = resultado.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
  // Evita que un "</script>" dentro del código cierre la etiqueta antes de tiempo.
  const jsSeguro = js.replace(/<\/script/gi, '<\\/script');

  let html = await readFile(fuente, 'utf8');
  html = html
    .replace(/\s*<link[^>]+href=["']\.\/estilo\.css["'][^>]*>/, '')
    .replace(/<script type="module" src=["']\.\/main\.js["']><\/script>/,
      () => `<style>${css}</style>`)
    .replace('</body>', () => `<script>${jsSeguro}</script>\n</body>`);

  const salida = path.join(dir, 'index.html');
  await writeFile(salida, html);
  return { salida, kb: Math.round(Buffer.byteLength(html) / 1024) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const carpetas = process.argv.slice(2).length ? process.argv.slice(2) : buscarModelos(RAIZ);
  let fallos = 0;
  for (const c of carpetas) {
    try {
      const { salida, kb } = await empaquetar(c);
      console.log(`✓ ${path.relative(RAIZ, salida)} (${kb} KB)`);
    } catch (e) {
      fallos++;
      console.error(`✗ ${path.relative(RAIZ, path.resolve(c))}\n${e.errors?.map((x) => `  ${x.location?.file}:${x.location?.line} ${x.text}`).join('\n') ?? e.message}`);
    }
  }
  process.exit(fallos ? 1 : 0);
}
