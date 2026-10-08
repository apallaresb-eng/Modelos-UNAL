// Crea un modelo nuevo a partir de la plantilla.
// Uso: npm run nuevo -- <materia> <tema>      ej: npm run nuevo -- fisica pendulo-simple
import { cpSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { empaquetar } from './empaquetar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [materia, tema] = process.argv.slice(2).map((s) => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
if (!materia || !tema) { console.error('Uso: npm run nuevo -- <materia> <tema>'); process.exit(1); }

const destino = path.join(RAIZ, 'modelos', materia, tema);
if (existsSync(destino)) { console.error(`Ya existe: ${path.relative(RAIZ, destino)}`); process.exit(1); }

cpSync(path.join(RAIZ, 'plantilla'), destino, { recursive: true, filter: (f) => !/index\.html$|README\.md$/.test(f) });
writeFileSync(path.join(destino, 'README.md'), `# ${tema.replace(/-/g, ' ')}

> Materia: ${materia} · Estado: borrador

## Fuente
Documento o enunciado del profesor, libros y artículos usados. Cita cada ecuación.

## Concepto clave y pregunta de asombro
¿Qué debe entender el público en 10 segundos? ¿Qué pregunta lo engancha?

## Modelo físico / científico
Ecuaciones, supuestos, simplificaciones y su validez. Casos límite verificados.

## Variables
| Variable | Símbolo | Unidad | Rango | Qué es | Si la subes |
|---|---|---|---|---|---|

## Estilo visual
Dirección de arte elegida y por qué encaja con el tema.

## Guion de exposición
1. Gancho (pregunta de asombro)
2. Demostración guiada
3. Predice y verifica con el público
4. Cierre: la idea en una frase

## Skills usadas
Lista de skills buscadas con find-skills para este tema.
`);
await empaquetar(destino);
console.log(`✓ Creado ${path.relative(RAIZ, destino)} (con su index.html). Edita main.js, estilo.css, fuente.html y README.md: el hook re-empaqueta en cada edición.`);
