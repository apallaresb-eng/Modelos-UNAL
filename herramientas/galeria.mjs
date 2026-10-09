// Construye el sitio de GitHub Pages en _sitio/: una galería (index.html) con cada modelo
// y una copia de cada index.html empaquetado. Lo usa .github/workflows/pages.yml.
// Uso: node herramientas/galeria.mjs   (antes: npm run empaquetar)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buscarModelos } from './comun.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITIO = path.join(RAIZ, '_sitio');
rmSync(SITIO, { recursive: true, force: true });
mkdirSync(SITIO, { recursive: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tarjetas = [];
for (const dir of buscarModelos(RAIZ)) {
  const rel = path.relative(RAIZ, dir).replaceAll(path.sep, '/');
  if (!existsSync(path.join(dir, 'index.html'))) continue;
  mkdirSync(path.join(SITIO, rel), { recursive: true });
  copyFileSync(path.join(dir, 'index.html'), path.join(SITIO, rel, 'index.html'));
  if (rel === 'plantilla') continue;
  const readme = existsSync(path.join(dir, 'README.md')) ? readFileSync(path.join(dir, 'README.md'), 'utf8') : '';
  const titulo = readme.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(dir);
  const materia = readme.match(/Materia:\s*([^·\n]+)/)?.[1]?.trim() ?? rel.split('/')[1];
  const formato = readme.match(/^Formato:\s*(.+)$/mi)?.[1]?.trim() ?? '3D';
  const resumen = readme.match(/^- \*\*Concepto:\*\*\s*(.+)$/m)?.[1] ?? readme.split('\n').find((l) => l && !l.startsWith('#') && !l.startsWith('>')) ?? '';
  const nota = existsSync(path.join(dir, 'calificacion.md')) ? readFileSync(path.join(dir, 'calificacion.md'), 'utf8').match(/Promedio:\s*([\d.,]+)/)?.[1] : null;
  tarjetas.push({ rel, titulo, materia, formato, resumen: resumen.replace(/\*\*|`/g, '').slice(0, 180), nota });
}

writeFileSync(path.join(SITIO, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Modelos UNAL</title>
<meta name="description" content="Modelos interactivos para exposiciones y entregas de la universidad.">
<style>
:root { --fondo:#0d0f14; --tinta:#eef0f5; --suave:#9aa3b5; --acento:#7cc4ff; --borde:rgba(255,255,255,.12); }
* { box-sizing: border-box; }
body { margin:0; background: radial-gradient(1200px 700px at 20% -10%, #1b2a44 0%, transparent 60%), var(--fondo); color:var(--tinta); font: 16px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; min-height:100vh; }
main { max-width: 1080px; margin: 0 auto; padding: 56px 16px 80px; }
h1 { font-size: clamp(2.2rem, 5vw, 3.6rem); margin: 0 0 8px; letter-spacing: -0.02em; }
.sub { color: var(--suave); margin: 0 0 36px; max-width: 60ch; }
.rejilla { display:grid; gap:16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
a.tarjeta { display:flex; flex-direction:column; gap:8px; padding:20px; border:1px solid var(--borde); border-radius:16px; color:inherit; text-decoration:none; background: rgba(255,255,255,.03); transition: transform .2s ease, border-color .2s ease; }
a.tarjeta:hover { transform: translateY(-3px); border-color: var(--acento); }
.materia { font-size:.75rem; letter-spacing:.12em; text-transform:uppercase; color: var(--acento); }
.tarjeta h2 { margin:0; font-size:1.25rem; }
.tarjeta p { margin:0; color: var(--suave); font-size:.93rem; }
.chips { display:flex; gap:6px; flex-wrap:wrap; margin-top:auto; padding-top:6px; }
.chip { font-size:.75rem; border:1px solid var(--borde); border-radius:999px; padding:2px 10px; color: var(--suave); }
.chip.nota { color: var(--tinta); }
footer { margin-top: 48px; color: var(--suave); font-size: .85rem; }
</style></head><body><main>
<h1>Modelos UNAL</h1>
<p class="sub">Modelos interactivos para explicar ciencia: simulaciones 3D, control por gestos y laboratorios con la cámara. Todo se procesa en tu equipo.</p>
<div class="rejilla">
${tarjetas.map((t) => `<a class="tarjeta" href="${esc(t.rel)}/">
  <span class="materia">${esc(t.materia)}</span><h2>${esc(t.titulo)}</h2><p>${esc(t.resumen)}</p>
  <div class="chips">${t.formato.split(/,\s*/).map((f) => `<span class="chip">${esc(f)}</span>`).join('')}${t.nota ? `<span class="chip nota">${esc(t.nota)}/10</span>` : ''}</div>
</a>`).join('\n')}
</div>
<footer>Para la cámara (gestos y laboratorio) usa Chrome o Edge en el portátil, o Chrome en Android.</footer>
</main></body></html>
`);
console.log(`✓ _sitio/ con ${tarjetas.length} modelo(s) + plantilla`);
