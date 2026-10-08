# Recursos reales (offline)

Texturas, HDRI y materiales reales para que ningún modelo use relleno procedural cuando existe algo mejor. Se importan con el alias `@recursos` y el empaquetador los incrusta en el `index.html`:

```js
import hdri from '@recursos/hdri/ferndale_studio_04_1k.hdr';      // → new HDRLoader().load(hdri, …)
import tierra from '@recursos/planetas/earth_day_4096.jpg';        // → new THREE.TextureLoader().load(tierra)
```

Para que no pese de más, optimiza antes de importar: `npm run recurso -- recursos/planetas/earth_day_4096.jpg --ancho 2048`. Esto genera un `.webp` al lado del original.

## Catálogo
| Carpeta | Archivo | Uso | Fuente · licencia |
|---|---|---|---|
| hdri | ferndale_studio_04_1k.hdr | Estudio fotográfico cálido (objetos, mecánica) | Poly Haven · CC0 |
| hdri | monochrome_studio_02_1k.hdr | Estudio neutro (productos, química) | Poly Haven · CC0 |
| hdri | venice_sunset_1k.hdr | Atardecer exterior | Poly Haven · CC0 |
| hdri | blouberg_sunrise_2_1k.hdr | Amanecer exterior, cielo abierto | Poly Haven · CC0 |
| hdri | moonless_golf_1k.hdr | Noche (astronomía desde la Tierra) | Poly Haven · CC0 |
| hdri | quarry_01_1k.hdr | Exterior diurno, cantera | Poly Haven · CC0 |
| planetas | earth_day_4096.jpg, earth_night_4096.jpg | Tierra de día y luces nocturnas | NASA Blue Marble / Black Marble · dominio público |
| planetas | earth_bump_roughness_clouds_4096.jpg, earth_normal_2048.jpg, earth_specular_2048.jpg, earth_clouds_1024.png | Relieve, océanos y nubes | NASA · dominio público (vía three.js) |
| planetas | moon_1024.jpg | Luna | NASA · dominio público (vía three.js) |
| materiales | hardwood2_{diffuse,bump,roughness}.jpg | Madera PBR (mesas, laboratorio) | Ejemplos de three.js · MIT |

## Cómo conseguir más desde la nube
Desde esta nube **solo responden GitHub y npm**. Poly Haven, NASA, Solar System Scope y ambientCG están bloqueados por la red. Hay dos caminos:
- **GitHub:** clonar solo la carpeta necesaria con `git clone --depth 1 --filter=blob:none --sparse <repo>` y luego `git sparse-checkout set <carpeta>`.
  - Ejemplo: `mrdoob/three.js` → `examples/textures/…` y `examples/models/gltf/…`.
  - Para otros planetas, buscar en GitHub espejos de las texturas de Solar System Scope (CC BY 4.0: hay que citarlos).
- **npm:** paquetes que traen modelos o texturas (verificar la licencia en su `package.json`).

Cada recurso nuevo se anota en esta tabla con su fuente y licencia. Si una licencia exige atribución, la cita va también en el README del modelo.
