// Hook PostToolUse de Claude Code (ver .claude/settings.json).
// Tras editar un archivo de un modelo, lo re-empaqueta y lo valida. Si algo falla,
// sale con código 2 para que Claude vea el problema y lo corrija.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carpetaDelModelo, buscarModelos } from './comun.mjs';
import { empaquetar } from './empaquetar.mjs';
import { validar } from './validar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let entrada = '';
for await (const trozo of process.stdin) entrada += trozo;
const archivo = JSON.parse(entrada || '{}')?.tool_input?.file_path;
if (!archivo || !/\.(html|js|css|md)$/.test(archivo)) process.exit(0);

const relativo = path.relative(RAIZ, path.resolve(archivo));
if (!/^(modelos|plantilla|nucleo)[\\/]/.test(relativo)) process.exit(0);

if (path.basename(archivo) === 'index.html') {
  console.error(`index.html es generado: edita fuente.html, main.js o estilo.css y se re-empaqueta solo (${relativo}).`);
  process.exit(2);
}

// Un cambio en el núcleo afecta a todos los modelos.
const carpetas = relativo.startsWith('nucleo') ? buscarModelos(RAIZ) : [carpetaDelModelo(archivo, RAIZ)].filter(Boolean);
const problemas = [];
for (const c of carpetas) {
  const nombre = path.relative(RAIZ, c);
  try {
    if (!archivo.endsWith('.md')) await empaquetar(c);
  } catch (e) {
    problemas.push(`${nombre}: no compila → ${e.errors?.map((x) => `${x.location?.file}:${x.location?.line} ${x.text}`).join('; ') ?? e.message}`);
    continue;
  }
  const { errores } = await validar(c);
  errores.forEach((e) => problemas.push(`${nombre}: ${e}`));
}

if (problemas.length) {
  console.error('Validación del modelo:\n' + problemas.map((p) => `- ${p}`).join('\n'));
  process.exit(2);
}
