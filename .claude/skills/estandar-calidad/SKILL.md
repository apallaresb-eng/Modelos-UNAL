---
name: estandar-calidad
description: Estándar OBLIGATORIO 9/10 de este repo. Rúbrica de 10 criterios, proceso con puertas (storyboard aprobado → cuadro héroe → construcción → rondas de calificación) y tácticas de las referencias del usuario (NASA Eyes/Apple, Bruno Simon, Bartosz Ciechanowski). Úsala SIEMPRE que se cree, mejore, revise o entregue cualquier modelo, simulación, expo o video del repo, y cuando el usuario diga que algo "no está a la altura", "se ve genérico" o pida subir la calidad.
---

# Estándar 9/10: nada se entrega por debajo

**Contexto:** el primer modelo (yoyo) salió en 5–6/10 y casi idéntico a lo que hace una sesión normal de Claude Code. Funcionaba y la física era correcta, pero no impresionaba. Este estándar existe para que eso no se repita. **Correcto no es suficiente.**

## Las referencias del usuario (qué es un 10)
| Referencia | Qué copiar en espíritu |
|---|---|
| **NASA Eyes / Apple** | Realismo cinematográfico: materiales PBR con texturas reales, luz HDRI, tone mapping AgX, bloom sutil, profundidad de campo, cámara que se mueve como un dron con *ease* largos, tipografía grande y silencio visual (pocas cosas, perfectas). |
| **Bruno Simon** | El mundo se explora: el usuario agarra, empuja y arrastra objetos que reaccionan con física. Hay sorpresas escondidas, sonido opcional y la sensación de juguete o videojuego. |
| **Bartosz Ciechanowski** | Cada paso aísla UNA idea, con diagramas vivos que el lector manipula. Se construye de lo simple a lo complejo, con precisión obsesiva y cero relleno. |

## Rúbrica (cada criterio de 0 a 10)
Aprueba solo si el **promedio es ≥ 9 y ningún criterio queda < 8**.

| # | Criterio | 6 = genérico | 8 = bueno | 10 = referencia |
|---|---|---|---|---|
| 1 | **Primeros 5 segundos** | Carga quieto, con paneles llenos de texto | Hay intro animada | Intro cinematográfica con una pregunta que engancha; da ganas de tocar |
| 2 | **Composición** | Protagonista < 15 % del cuadro y la interfaz domina | Protagonista ~25 %, interfaz ordenada | Protagonista ≥ 35 %, jerarquía clarísima, interfaz ≤ 25 % (≤ 10 % en modo expo) |
| 3 | **Claridad** | Párrafos; hay que leer para entender | Textos cortos | La idea se entiende en 10 s **sin leer**; ≤ 25 palabras por paso y ≤ 40 en pantalla al inicio |
| 4 | **Narrativa** | Solo un sandbox de sliders | Pasos, pero estáticos | Recorrido de 3–7 pasos (simple → complejo) con cámara y escena que actúan, más un modo libre |
| 5 | **Lo invisible se ve** | Flechas y números | Vectores claros con color con significado | El concepto abstracto se vuelve objeto: mano derecha animada, campo como partículas, energía como líquido, etc. |
| 6 | **Acabado** | Primitivas, luz plana, texturas procedurales pobres, cosas encimadas | PBR + sombras + HDRI | Texturas reales, AO, bloom y tone mapping; detalles (cuerda que se enrolla, desgaste, polvo); nada se tapa |
| 7 | **Movimiento** | Las cosas aparecen de golpe | Transiciones GSAP | Cámara coreografiada, *stagger*, easing con intención, micro-interacciones |
| 8 | **Interacción** | Solo sliders | Un objeto arrastrable | Manipulación directa de lo importante, respuesta inmediata y física al tacto |
| 9 | **Rigor** | Errores o simplificaciones sin declarar | Sin 🔴 del revisor | Sin 🔴 ni 🟡, pruebas contra soluciones analíticas y fuentes citadas |
| 10 | **Robustez** | Errores, tirones o ilegible en proyector | Funciona offline | Offline, 1366×768, celular, proyector (capturas legibles), cero errores y calidad adaptativa |

Además, la entrega siempre incluye la sección **"Versión genérica vs. esta"**: qué haría una sesión normal de Claude Code y en qué la supera esta, punto por punto. Si no se puede escribir con convicción, no es un 9.

## Proceso con puertas (no se salta ninguna)
1. **Brief:** concepto clave, pregunta de asombro, error común, público y duración (skill `simulacion-cientifica`, pasos 0–2).
2. **Storyboard → APROBACIÓN DEL USUARIO.** Son 4–6 cuadros clave. Para cada uno: encuadre de cámara, qué se ve, qué acción ocurre, texto (≤ 25 palabras) y el "momento wow". Se presenta como boceto (SVG o descripción precisa) con AskUserQuestion. **No se escribe código de escena antes de la aprobación.**
3. **Referencias y recursos:**
   - Tres referencias visuales concretas, propuestas por el agente `director-de-arte`.
   - Recursos reales de `recursos/`: HDRI, texturas de NASA, materiales.
   - Si faltan, se buscan en GitHub o npm, que son lo único alcanzable desde la nube (ver `recursos/README.md`).
4. **Cuadro héroe:** una sola imagen fija de la escena, sin interfaz, con su mejor luz y material. El agente `evaluador-calidad` la juzga solo en *acabado* y *composición*, y debe sacar ≥ 9. **Hasta que lo logre no se construye el resto.**
5. **Construcción**, en este orden:
   - escena;
   - intro (`crearIntro`);
   - recorrido (`crearRecorrido`);
   - modo libre;
   - manipulación (`crearAsa`);
   - etiquetas (`crearEtiquetas`);
   - post-procesado (`crearPostproceso`);
   - por último, la interfaz mínima (el panel, solo en modo libre, con `.solo-libre`).
6. **Rondas de calificación**, mínimo 2:
   1. `npm run calificar -- <modelo>`.
   2. El agente `evaluador-calidad` califica.
   3. Se corrige todo lo que esté por debajo de 9.
   4. Se repite.

   El evaluador escribe `calificacion.md` en la carpeta del modelo.
7. **Entrega:**
   - `npm run validar:entrega -- <modelo>` en verde;
   - tabla de notas al usuario con las capturas;
   - la sección "Versión genérica vs. esta".

   Si tras **3 rondas** no llega a 9, se le dice al usuario con las notas reales y qué falta. **Nunca se maquilla una nota.**

## Tácticas concretas que suben nota
- **Primeros 5 s:** cámara que entra desde lejos (`crearIntro`), título grande y nada de paneles hasta terminar la intro.
- **Composición:** encuadra para que el protagonista llene el centro. Paneles ocultos por defecto, panel de variables solo en modo libre. Usa el modo expo (E) como vista principal.
- **Lo invisible:** los vectores no son conos genéricos, son objetos con forma y animación (flechas que "crecen" con GSAP, partículas que fluyen en la dirección de la fuerza). La regla de la mano derecha se muestra con una mano.
- **Acabado:**
  - HDRI de `recursos/hdri/` en `scene.environment`;
  - texturas reales con mapas de normal y rugosidad;
  - `crearPostproceso` (AgX + bloom + viñeta + AO en calidad alta);
  - sombras de contacto;
  - nada de geometría por defecto sin bisel.
- **Movimiento:** usa GSAP para todo cambio de estado. Ningún número salta: se interpola.
- **Interacción:** arrastrar es más intuitivo que un slider. Las variables importantes se manipulan en la escena y el slider queda como respaldo.
- **Robustez:** prueba con el filtro de proyector (captura 08). Si algo no se lee ahí, sube contraste y tamaño.

## Formatos alternativos
Gestos, laboratorio con cámara, RA, expo viva y video suman criterios extra: skill `formatos-alternativos`. La nota de un modelo con varios formatos es la del formato que peor salga.

## Lo que el estándar NO permite
- Entregar sin `calificacion.md` aprobado (lo bloquea `npm run validar:entrega`).
  - Sí se permite el **borrador de prueba**: publicarlo en Pages para probarlo en equipos reales. La galería lo pone en "En prueba" con la franja "Versión de prueba · no entregable" y su nota real. Nunca se entrega ni se anuncia como terminado.
- Autocalificarse: califica el agente `evaluador-calidad`, que no construyó el modelo.
- Paneles con párrafos al inicio, texto que se tapa, primitivas sin detalle o texturas procedurales "de relleno" cuando existe un recurso real.
