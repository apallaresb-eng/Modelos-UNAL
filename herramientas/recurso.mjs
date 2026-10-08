// Optimiza una textura para incrustarla: redimensiona y convierte a WebP (o JPG con --jpg).
// Uso: npm run recurso -- recursos/planetas/earth_day_4096.jpg --ancho 2048 [--calidad 82] [--jpg]
import sharp from 'sharp';
import { statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith('--'));
const opcion = (n, def) => { const i = args.indexOf(`--${n}`); return i >= 0 ? Number(args[i + 1]) : def; };
if (!archivo) { console.error('Uso: npm run recurso -- <imagen> --ancho 2048 [--calidad 82] [--jpg]'); process.exit(1); }

const ancho = opcion('ancho', 2048);
const calidad = opcion('calidad', 82);
const jpg = args.includes('--jpg');
const destino = archivo.replace(/\.[^.]+$/, `_${ancho}.${jpg ? 'jpg' : 'webp'}`);
const img = sharp(archivo).resize({ width: ancho, withoutEnlargement: true });
await (jpg ? img.jpeg({ quality: calidad, mozjpeg: true }) : img.webp({ quality: calidad })).toFile(destino);
const kb = (f) => Math.round(statSync(f).size / 1024);
console.log(`✓ ${path.basename(destino)}: ${kb(archivo)} KB → ${kb(destino)} KB`);
