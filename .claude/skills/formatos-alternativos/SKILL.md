---
name: formatos-alternativos
description: Definición y estándar de los 5 formatos de este repo además de la simulación 3D base — control por GESTOS con la cámara, LABORATORIO con cámara/sensores, REALIDAD AUMENTADA, EXPO VIVA y VIDEO programático. Úsala cuando un modelo use cámara web, gestos con las manos, mediciones de objetos reales, RA en el celular, una exposición guiada o un video generado, y para decidir qué formato le conviene a un tema. Se suma (no reemplaza) al estándar 9/10 de `estandar-calidad`.
---

# Formatos alternativos

Todo formato cumple **primero** la rúbrica 9/10 (`estandar-calidad`) y además los criterios extra de su sección. El formato se declara en el README del modelo con una línea `Formato: 3D, gestos, laboratorio` (los que apliquen). `npm run validar:entrega` exige las piezas de cada formato declarado.

Equipos del usuario: portátil con cámara web y celular Android. Publicación: GitHub Pages (HTTPS, necesario para la cámara del celular).

## 1. Control por gestos 🖐 (`@nucleo/gestos.js`)
**Cuándo:** exposiciones donde manipular "con las manos en el aire" aporta: mover cuerpos, girar sistemas, recorrer el tiempo. **No** para entradas precisas (números exactos): ahí van los sliders.

**Piezas obligatorias:**
- `iniciarGestos({ video, contextos, alEvento })` con la pantalla de permiso `pedirPermiso` y el `indicadorCamara` de privacidad.
- **Respaldo:** todo lo que se hace con gestos también se hace con mouse o teclado. Si no hay cámara, el modelo sigue completo.
- Ventanita con la imagen de la cámara y la mano dibujada, más la **chuleta** con los gestos activos (la crea el núcleo).

**Criterios extra:**
- **4 gestos base** siempre activos (`mover`, `pausa`, `navegar` más uno del tema si hace falta) y **gestos de contexto** que se activan por paso del recorrido (`g.activar([...])`).
- Catálogo de ~10–12 gestos en total, de **una y dos manos**, con **máximo 5 activos a la vez**.
- Cada gesto con ≥ 95 % de aciertos en `node herramientas/pruebas/gestos.test.mjs`, y ningún par de gestos activos simultáneamente que se confundan.
- La respuesta se siente inmediata: el detector tarda < 100 ms en un portátil normal. El filtro One Euro evita el temblor.
- Calibración ≤ 10 s. La primera vez, el recorrido enseña cada gesto con su ícono.

**Catálogo** (`nucleo/gestos-clasificador.js`): mano abierta→`mover` · puño→`pausa` · pulgar al lado→`navegar` · pulgar arriba→`confirmar` · pellizco→`alternar` · señalar→`apuntar` · V girando la muñeca→`perilla` · aplaudir→`aplauso` · dos pellizcos separándose→`zoom` · dos puños como volante→`volante`. Para agregar gestos: se definen en el clasificador, se prueban con manos sintéticas (`herramientas/pruebas/manos-sinteticas.mjs`) y se calibran con la mano real del usuario.

**Cómo se prueba:**
- El clasificador, en Node con manos sintéticas.
- El flujo completo, en Chromium con cámara falsa (`--use-fake-device-for-media-stream`), comprobando que no haya errores y que funcione sin red.
- **La prueba final la hace el usuario** con su mano: se le da el link y una lista de verificación (luz, distancia, cada gesto).

## 2. Laboratorio con cámara 🔬 (`@nucleo/seguimiento.js` y similares)
**Cuándo:** el fenómeno se puede reproducir en casa con objetos comunes y medir con la cámara. El modelo compara **medición contra teoría** en vivo.

**Piezas obligatorias:**
- Instrucciones del montaje casero, ilustradas, con objetos que cualquiera tiene.
- Calibración guiada ≤ 30 s.
- La medición siempre se muestra **con su incertidumbre** y marca cuándo está fuera del rango válido (`confiable: false`).
- Gráfico en vivo de lo medido contra la curva teórica.
- **Video de respaldo** incrustado (`?video=` o un botón), por si en el salón la luz o la cámara fallan.

**Criterios extra:**
- El método de medición se valida con datos sintéticos cuya respuesta se conoce, con error ≤ 0,05 en el rango declarado. El rango válido se escribe en el README; no se oculta.
- Debe funcionar con la luz de un cuarto normal. Si la luz no alcanza, lo dice en pantalla.

**Cómo se prueba:**
- En Node con imágenes sintéticas (`herramientas/pruebas/seguimiento.test.mjs`).
- En Chromium con un video `.y4m` como cámara falsa.
- La prueba final, el usuario con el montaje real.

## 3. Realidad aumentada 📱 (siguiente)
Android con WebXR (`immersive-ar`, hit-test sobre la mesa) y siempre una alternativa sin RA. Se genera un QR del link de Pages para el público. La escala real o "de mesa" se elige con un botón. Solo funciona desde HTTPS.

## 4. Expo viva 🎤 (siguiente)
El recorrido controla la exposición completa: se avanza con flechas, con un presentador inalámbrico (que envía teclas) o con gestos. Incluye **notas para quien expone** en una segunda ventana (`?notas`) y un temporizador. Lo que se ve en la pantalla grande no tiene paneles.

## 5. Video programático 🎬 (siguiente)
El video se genera desde el mismo modelo con Playwright (grabando el recorrido) o con Remotion/Manim para piezas explicativas. Sale en 1080p a 60 fps, con subtítulos en español y una duración de 30–90 s por idea. Sirve para el informe y como respaldo de la expo.

## Elegir formato (pregunta al usuario si hay duda)
| El tema… | Formato fuerte |
|---|---|
| Tiene objetos que se mueven en el espacio (órbitas, mecanismos) | 3D + gestos |
| Se puede reproducir en casa y medir | Laboratorio |
| Tiene objetos espectaculares a escala (planetas, moléculas, estructuras) | Realidad aumentada |
| Es una exposición con guion | Expo viva (+ gestos para el momento wow) |
| Requiere entregar un informe | Video programático como anexo |
