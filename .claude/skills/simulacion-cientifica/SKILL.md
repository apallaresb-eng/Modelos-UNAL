---
name: simulacion-cientifica
description: Flujo obligatorio para crear cualquier modelo, simulación, animación o exposición interactiva de este repo (física, química, astronomía, biología, matemáticas, ingeniería) a partir de un documento, enunciado, ejercicio o tema. Úsala siempre que el usuario pida "hazme un modelo / simulación / animación / expo de…", un ejercicio de péndulo, yoyo, órbitas, titulación, moléculas, etc. Orquesta find-skills, revisor-cientifico, direccion-de-arte y qa-rendimiento.
---

# Simulación científica: de un documento a un modelo que se entiende en 10 segundos

> **Este flujo va dentro del estándar 9/10 (skill `estandar-calidad`), que es bloqueante.** Después del paso 4 viene la puerta del **storyboard aprobado por el usuario** y luego la del **cuadro héroe ≥ 9**; solo entonces se construye (paso 5). La entrega (paso 6) exige ≥ 2 rondas del agente `evaluador-calidad` y `npm run validar:entrega` en verde.

Meta: modelos **rigurosos por dentro y obvios por fuera**. Que el público diga "¡ah, por eso gira así!".

## Paso 0 — Buscar skills del tema (OBLIGATORIO, antes de diseñar nada)
1. Usa la skill `find-skills`. Busca con palabras del tema y del formato: el fenómeno ("pendulum", "titration", "orbit"), la librería ("matter.js", "3Dmol", "cannon") y el formato ("webxr", "manim").
2. Si `npx skills find` responde "No skills found" para todo, skills.sh está bloqueado en esta red. Busca en la web (WebSearch: `"<tema>" SKILL.md claude skill`) y verifica cada candidato con `npx skills add <repo> --list`.
3. Repos ya probados: `K-Dense-AI/claude-scientific-skills`, `omer-metin/skills-for-antigravity`, `sickn33/antigravity-awesome-skills`, `TerminalSkills/skills`, `OpenAEC-Foundation/Three.js-Claude-Skill-Package`.
4. Propón al usuario las que valgan la pena: nombre, para qué sirve y fuente. Instálalas solo con su visto bueno y **lee el SKILL.md y los scripts antes**. Anótalas en la sección "Skills usadas" del README del modelo.

## Paso 1 — Entender el tema (no adivines: pregunta)
- Lee el documento completo. Extrae qué pide el profesor, el nivel (semestre, carrera) y cuánto dura la exposición.
- Escribe en 3 líneas el **concepto clave**, la **pregunta de asombro** (el gancho) y el **error común** que tiene la gente sobre el tema.
- Si falta algo (datos, duración, enfoque), pregúntalo con AskUserQuestion.

## Paso 2 — Modelo científico verificable
- Escribe las ecuaciones con sus **unidades**, **supuestos** y **rango de validez**. Ejemplo: en el péndulo, ángulo pequeño contra ángulo grande.
- Para la integración usa `physics-simulation`: RK4 para casos generales, Verlet o simpléctico si debe conservarse la energía, sub-pasos si el sistema es rígido. **Nunca Euler explícito** para oscilaciones.
- Usa `sympy` para derivar o comprobar las expresiones. Usa `astropy` para constantes y unidades astronómicas, y `rdkit` para moléculas.
- Valida contra **casos límite y soluciones analíticas**: amortiguamiento 0, masa infinita, periodo teórico, conservación de la energía. Deja escritas esas comprobaciones en el README.
- Pásale el modelo al agente **revisor-cientifico** antes de construir la escena.

## Paso 3 — Elegir el formato (uno o varios) → skill `formatos-alternativos`
| Formato | Brilla cuando… | Skills clave |
|---|---|---|
| Simulación 3D interactiva (base) | hay movimiento, fuerzas o geometría espacial | threejs-*, physics-simulation |
| Expo viva (scrollytelling 3D) | es una exposición con guion paso a paso | gsap-timeline, gsap-scrolltrigger, revealjs |
| Control por gestos | quieres un momento "wow" en vivo | hand-gesture-recognition |
| Sensores / laboratorio real | se puede medir el fenómeno real (webcam, celular) | sensor-fusion |
| Realidad aumentada | objetos que impresionan a escala (planetas, moléculas) | vr-ar-development, aframe-webxr |
| Video programático | informe escrito, respaldo o para compartir | remotion-*, manimce-best-practices, explainer-videos |

## Paso 4 — Diseño pedagógico (simple de entender)
- Usa `learning-experience` y `explain-like-socrates`. **Una idea por pantalla.**
- Lleva la mirada a lo importante: vectores de fuerza, trayectorias, energía como barra o color. Oculta lo accesorio.
- Elige **3–6 variables manipulables**. Cada una lleva símbolo, unidad, rango realista, **"qué es"** y **"si la subes"**: el campo `que` y el campo `siSube` de `crearPanel`.
- Incluye **"Predice y verifica"** (`crearPrediccion`): el público adivina y el modelo lo demuestra.
- Pon la ecuación visible (KaTeX) y conecta cada término con algo de la escena, por ejemplo con el mismo color.
- La dirección visual la decide la skill `direccion-de-arte`: estilo único, nunca genérico.

## Paso 5 — Construir
1. `npm run nuevo -- <materia> <tema>`: crea la carpeta desde `plantilla/`.
2. Edita `main.js` (física, escena, panel), `estilo.css` (identidad visual), `fuente.html` (textos) y `README.md`.
3. El hook re-empaqueta `index.html` y valida en cada edición. **Nunca edites `index.html` a mano.**
4. Usa siempre el núcleo (`@nucleo`): calidad adaptativa, la casilla "Calidad alta", Grabar y Captura HD.
5. Todo debe funcionar **sin internet**. Instala las librerías con npm, nunca desde CDN. Las fuentes van con `@fontsource/*` y los modelos/texturas se importan para que queden incrustados.

Piezas obligatorias del núcleo:
- `crearIntro`, intro cinematográfica;
- `crearRecorrido`, de 3–7 pasos con ≤ 25 palabras cada uno;
- modo expo (viene en la barra, tecla E);
- `crearPostproceso`;
- `crearEtiquetas`, que no se tapan y salen en el video;
- `crearAsa`, para arrastrar lo importante;
- recursos reales de `recursos/` (HDRI y texturas).

El panel de variables va solo en modo libre (clase `.solo-libre` en su tarjeta).

## Paso 6 — Verificar antes de entregar
- `npm run calificar -- <modelo>` y el agente `evaluador-calidad` (≥ 2 rondas), hasta que `calificacion.md` diga APROBADO. Luego `npm run validar:entrega -- <modelo>`.
- `npm run probar -- modelos/<materia>/<tema>`: sin errores de consola, sin intentos de red y con capturas en `pruebas/`. **Mira las capturas.**
- Agente **qa-rendimiento** para rendimiento y equipos básicos. Agente **director-de-arte** para la crítica visual.
- Completa el README: fuente, variables, guion de exposición (gancho → demostración → predice y verifica → cierre) y skills usadas.
- Ofrece publicar el link (Artifact) para el profesor.
