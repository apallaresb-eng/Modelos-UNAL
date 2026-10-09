# Modelos-UNAL: reglas para Claude

Repo de **modelos interactivos para la universidad**: simulaciones 3D, expo viva (scrollytelling), control por gestos, laboratorio con sensores, realidad aumentada y video programático. El usuario estudia Ingeniería (2.º semestre) y también hace modelos para amigos de otras carreras. Presenta desde su portátil con video beam, entrega links al profesor y usa capturas o video en los informes. **Todo en español.**

## Estándar 9/10 (BLOQUEANTE)
El usuario exige **mínimo 9/10** en toda entrega. El primer yoyo sacó 5–6: funcionaba, pero se veía genérico. Desde ahora:
- Se sigue la skill **`estandar-calidad`**: rúbrica de 10 criterios y el proceso con puertas **brief → storyboard aprobado por el usuario → cuadro héroe ≥ 9 → construcción → ≥ 2 rondas de calificación**.
- Califica el agente **`evaluador-calidad`**, nunca quien construyó el modelo. Lo hace con las capturas de `npm run calificar` y escribe `calificacion.md`.
- **No se entrega ni se publica** nada que no pase `npm run validar:entrega -- <modelo>`, que exige promedio ≥ 9, ningún criterio < 8 y las piezas del núcleo (intro, recorrido, post-procesado, etiquetas, manipulación).
  - **Única excepción, el borrador de prueba** (aprobada por el usuario): para probar algo en equipos reales (cámara en el celular, gestos), un modelo sin aprobar sale en GitHub Pages en la sección "En prueba" y con una franja fija "Versión de prueba · no entregable · nota actual" que pone `herramientas/galeria.mjs`. Un borrador **nunca se entrega** ni se presenta como terminado.
- Si tras 3 rondas no llega a 9, se informa al usuario con las notas reales. Prohibido maquillar.
- Referencias del usuario para un 10: **NASA Eyes / Apple** (realismo cinematográfico), **Bruno Simon** (explorar jugando) y **Bartosz Ciechanowski** (una idea por paso, diagramas vivos).
- Recursos reales (HDRI, texturas de NASA, materiales) en `recursos/`; ver su README. Desde la nube solo responden GitHub y npm (y storage.googleapis.com para modelos de MediaPipe).
- **Formatos alternativos** (gestos, laboratorio con cámara, RA, expo viva, video): skill **`formatos-alternativos`**, que suma criterios extra al 9/10. Se declaran en el README con `Formato: …`.

## Antes de empezar CADA simulación (obligatorio)
1. **Buscar skills del tema con `find-skills`.** Si skills.sh está bloqueado ("No skills found" en todo), busca en la web y verifica en GitHub con `npx skills add <repo> --list`. Propón al usuario las que encajen; lee su SKILL.md y sus scripts antes de instalarlas.
2. Seguir la skill **`simulacion-cientifica`** (flujo completo) y la skill **`direccion-de-arte`** (estilo único).
3. Preguntar lo que falte: documento, duración de la expo, nivel del público, formato.

## Reglas de calidad
- **Fundamento científico primero, explicación sencilla después.** Ecuaciones con unidades, supuestos declarados, validación contra casos analíticos y fuentes citadas en el README. Revisión con el agente `revisor-cientifico`.
- **Estilo visual único por modelo.** Prohibido el look de "demo genérica de Three.js". Usar el agente `director-de-arte`.
- **Interactivo y explicado**: 3–6 variables, cada una con su "qué es" y su "si la subes", más un "Predice y verifica".
- **Un solo archivo que funcione sin internet**: librerías por npm (nunca CDN), fuentes con `@fontsource/*`, recursos importados para que queden incrustados.
- **Calidad adaptativa** con la casilla "Calidad alta", y botones **Grabar** (.webm) y **Captura HD** (.png). Todo viene del núcleo (`@nucleo`).
- Antes de entregar: `npm run probar` sin errores y capturas revisadas. Usar el agente `qa-rendimiento`.

## Estructura
```
modelos/<materia>/<tema>/   fuente.html · main.js · estilo.css · README.md → index.html (generado)
plantilla/                  ejemplo base (oscilador amortiguado) que copia `npm run nuevo`
nucleo/                     calidad adaptativa, panel, predice y verifica, grabar/captura, intro, recorrido,
                            modo expo (E), post-procesado, etiquetas sin solapes, asas arrastrables
recursos/                   HDRI, texturas de NASA y materiales reales (alias @recursos)
herramientas/               empaquetar, validar, probar (Playwright sin red), nuevo-modelo, hooks
.claude/skills/             skills instaladas (ver skills-lock.json) + simulacion-cientifica + direccion-de-arte
.claude/agents/             revisor-cientifico · director-de-arte · qa-rendimiento · evaluador-calidad
```

## Comandos
- `npm run nuevo -- <materia> <tema>`: crea un modelo desde la plantilla.
- `npm run empaquetar [-- carpeta]`: genera `index.html` autocontenido. El hook lo hace solo tras cada edición.
- `npm run validar [-- carpeta]`: revisa las reglas (sin red, núcleo, README con Fuente/Variables/Guion).
- `npm run probar [-- carpeta]`: Chromium sin internet, errores, FPS y capturas en `pruebas/` (ignorada por git).
- `npm run calificar -- <carpeta>`: capturas estándar (primeros segundos, cada paso, modo libre/expo, 1366, proyector, celular) y métricas para `evaluador-calidad`.
- `npm run validar:entrega [-- carpeta]`: puerta final; exige las piezas del estándar y `calificacion.md` aprobado.
- `npm run recurso -- <imagen> --ancho 2048`: optimiza una textura a WebP antes de incrustarla.
- `npm run probar:nucleo`: pruebas de gestos (manos sintéticas) y del laboratorio (pelota sintética).
- `npm run probar:gestos`: gestos de punta a punta en Chromium (cada gesto en su paso, contextos, chuleta, sin permiso/sin cámara) y con fotos reales de manos como cámara falsa. Necesita Chromium y ffmpeg (no corre en Pages).
- Cámara: `@nucleo/camara.js` (permiso, privacidad, respaldo), `@nucleo/gestos.js` (MediaPipe incrustado, ~12 MB, importar solo si se usa), `@nucleo/seguimiento.js` (fracción iluminada de una pelota real).

## Notas
- **Nunca edites `index.html` a mano**: es generado; el hook lo rechaza.
- En la nube no hay GPU: los FPS de `probar` sirven para comparar niveles, no como valor real.
- La realidad aumentada en celular necesita el link publicado (HTTPS), no el archivo local.
- Manim y las skills científicas en Python (sympy, astropy, rdkit) requieren `pip install` del paquete cuando se usen.
