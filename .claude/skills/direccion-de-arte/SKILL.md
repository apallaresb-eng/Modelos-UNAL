---
name: direccion-de-arte
description: Define la identidad visual ÚNICA de cada modelo de este repo (paleta, tipografía, materiales, iluminación, movimiento) para que ninguno se vea como una demo genérica de Three.js. Úsala al empezar cualquier modelo, simulación, expo viva o video, y cuando el usuario diga que algo "se ve genérico/feo/aburrido" o pida "otro estilo".
---

# Dirección de arte: cada modelo con su propia personalidad

Regla de oro: **el estilo nace del tema**. Un péndulo de un reloj antiguo no se ve igual que una titulación o una nebulosa. Complementa con `frontend-design` y `anti-slop-design`, y con `algorithmic-art` o `shader-programming-glsl` cuando haga falta.

## 1. Antes de elegir
- Revisa los estilos usados en los otros modelos (`grep -h "Estilo visual" -A3 modelos/*/*/README.md`). **No repitas** el estilo del modelo anterior.
- Propón al usuario **2–3 direcciones** con nombre, paleta (hex), fuentes y una frase de por qué encaja. Si el agente `director-de-arte` está disponible, pídeselas a él.

## 2. Catálogo de partida (inspiración, no plantilla)
| Estilo | Encaja con | Rasgos |
|---|---|---|
| Plano técnico (blueprint) | mecánica, máquinas, yoyo | fondo azul tinta, líneas de cota, tipografía de ingeniero, materiales planos con contorno |
| Acuarela científica | biología, química orgánica | papel texturizado, pigmentos que se difuminan, trazos de cuaderno de campo |
| Laboratorio vintage | química analítica, titulaciones | vidrio con refracción, latón, etiquetas tipográficas antiguas, luz cálida |
| Neón sci-fi | electromagnetismo, cuántica | negro profundo, emisivos con bloom, rejillas, partículas |
| Origami / papel | geometría, ondas, vectores | caras planas con sombra suave, colores pastel, pliegues |
| Observatorio | astronomía, órbitas | polvo estelar, escalas logarítmicas, HUD sobrio, tipografía condensada |
| Arcilla (claymorphism) | introducción, público general | formas redondas, luz de estudio, colores caramelo |
| Grabado / tinta | historia de la ciencia, termodinámica | rayado, alto contraste, monocromo con un acento |

Combina o inventa estilos: el catálogo es un punto de partida, no un límite.

## 3. Reglas que siempre se cumplen
- **Paleta propia** de 4–6 colores en `estilo.css` (variables `--fondo`, `--tinta`, `--acento`, `--acento-2`…). El color **significa algo**: el mismo color para una magnitud en la ecuación, el panel y la escena.
- **Tipografía propia**, sin internet: `npm i @fontsource/<fuente>` e importa su CSS en `main.js`. Nunca uses solo `system-ui` en el título.
- **Legible en video beam**: alto contraste, textos ≥ 18 px a 1080p, nada importante en tonos medios sobre fondo medio. Pruébalo con la captura de `npm run probar`.
- **Movimiento con intención**: entradas con GSAP, cámara que acompaña la explicación. Respeta `prefers-reduced-motion`.
- **Prohibido el look genérico**: cubo gris con fondo negro, luz ambiente plana, OrbitControls como única interacción o la paleta azul/morado de IA por defecto.
- Los efectos caros (bloom, sombras suaves, partículas densas) solo se activan con la calidad `alta` (`calidad.alCambiar`).

## 4. Cierre
Documenta en la sección "Estilo visual" del README el nombre del estilo, la paleta, las fuentes y por qué encaja con el tema.
