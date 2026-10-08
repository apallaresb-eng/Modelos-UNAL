# Yoyo horizontal: torques

> Materia: Física I (Departamento de Física, UNAL) · Estado: listo para estudiar

Abre `index.html` con doble clic; funciona sin internet.

## Fuente
- Taller "YOYO HORIZONTAL": Casos A y B, Departamento de Física, Universidad Nacional de Colombia (5 sep 2026).
- Dinámica de rotación del cuerpo rígido y rodadura sin deslizamiento: Serway & Jewett, *Física para ciencias e ingeniería*, cap. 10–11. Resnick, Halliday & Krane, *Física*, vol. 1, cap. 12.
- Paradoja del carrete (*spool paradox*): Halliday, Resnick & Walker, *Fundamentals of Physics*, problemas de rodadura con cuerda enrollada.

## Concepto clave y pregunta de asombro
- **Truco para predecir:** toma torques respecto al punto de contacto con el suelo. Ahí la fricción y la normal no hacen torque, y el de la cuerda es F·(Rμ cosθ ± Rc).
- **Concepto:** el sentido de giro lo decide la suma de torques, τ = r × F, de la cuerda y de la fricción. Cada uno se representa como un vector perpendicular al plano del dibujo.
- **Pregunta de asombro:** "Si la cuerda sale por debajo del eje, ¿el yoyo se aleja o viene hacia ti?". En los dos casos viene hacia ti. Y si inclinas la cuerda lo suficiente, ¡se aleja!
- **Error común:** creer que la fricción siempre vale μN y siempre apunta contra el movimiento.

## Modelo físico / científico
Ejes: x → derecha, y ↑, z sale del plano (⊙ sale, ⊗ entra). s = +1 en el Caso A (cuerda arriba) y −1 en el Caso B (cuerda abajo). I = k·m·Rμ².

| Ecuación | Significado |
|---|---|
| m·a = F cosθ + f | Traslación (f es la fricción, + hacia la derecha) |
| N = m·g − F senθ | Normal |
| I·α = τc + τμ,  τc = −s·Rc·F,  τμ = Rμ·f | Rotación (componentes z) |
| a = −Rμ·α | Rueda sin deslizar |
| **a = F (cosθ + s·Rc/Rμ) / (m(1+k))** | Resultado |
| f = F (s·Rc/Rμ − k cosθ) / (1+k) | Fricción **estática** necesaria; debe cumplir \|f\| ≤ μN |

**Supuestos:** cuerpo rígido, cuerda ideal (sin masa) que sale tangente al eje, sin resistencia a la rodadura (al soltar, sigue rodando a velocidad constante) y μ estático = μ cinético. Solo se modela el movimiento horizontal: si F·senθ > mg, el modelo avisa "¡Se levanta!" y deja de haber contacto (no se simula el vuelo). Si la fricción necesaria supera μN, el yoyo **desliza** y la fricción pasa a ser cinética: f = μN, opuesta a la velocidad del punto de contacto.

**Respuestas del taller** (θ = 0):
- **Caso A:** τ cuerda ⊗ entra, τ fricción ⊗ entra (con eje delgado). Rueda → derecha.
- **Caso B:** τ cuerda ⊙ sale, τ fricción ⊗ entra y |τμ| > |τc|. Rueda → derecha.

**Matices** (se muestran en el modelo como "Dato curioso"):
1. Al rodar sin deslizar, la fricción es estática: vale lo necesario (≤ μN), no siempre μN.
2. En el Caso A, si Rc/Rμ > k·cosθ (con θ = 0: Rc/Rμ > k), la fricción apunta **hacia adelante** y su torque sale ⊙.

**Bonus, paradoja del carrete:** en el Caso B el yoyo no rueda cuando cos θc = Rc/Rμ. Por encima de ese ángulo rueda alejándose de quien jala.

**Verificación:** `node modelos/fisica/yoyo-horizontal/fisica.test.mjs` comprueba:
- la aceleración contra la fórmula analítica;
- x(t) = ½at²;
- que v + ωRμ = 0 (rodadura);
- que Iα = τc + τμ;
- los signos de los torques en A y B;
- que |τμ| > |τc| en el Caso B;
- el dato curioso;
- la paradoja a los dos lados de θc;
- el deslizamiento con |f| = μN, y que la velocidad del punto de contacto crezca a ritmo constante mientras desliza;
- que al soltar la cuerda el yoyo siga a velocidad constante.

Todas las expresiones se derivaron y comprobaron con SymPy.

## Variables
| Variable | Símbolo | Unidad | Rango | Qué es | Si la subes |
|---|---|---|---|---|---|
| Fuerza de la cuerda | F | N | 0 – 1 | Qué tan fuerte jalas | Acelera más; si te pasas, desliza |
| Radio de la cuerda | Rc | cm | 0,3 – 2,4 | Brazo de palanca de F | Crece τc; en el Caso A la fricción puede cambiar de sentido |
| Ángulo de la cuerda | θ | ° | 0 – 85 | Inclinación de la cuerda (el taller usa 0°) | En el Caso B, pasado θc, el yoyo rueda al revés |
| Coeficiente de fricción | μ | – | 0,05 – 1 | Agarre del suelo | Aguanta más fuerza sin deslizar |
| Distribución de masa | k = I/(mRμ²) | – | 0,3 – 1 | 0,5 = disco macizo, 1 = aro | Cuesta más girarlo; acelera menos |

Fijos: m = 60 g, Rμ = 2,8 cm (un yoyo típico), g = 9,8 m/s². Un yoyo real, con la masa en los bordes, tiene k entre 0,6 y 0,8; el valor por defecto, 0,5, es el de un disco macizo.

## Estilo visual
**Juguetería retro:**
- **Fondo y objetos:** papel crema, mesa de madera con marcas de regla cada 10 cm, yoyo de laca azul con rayos en la cara (permiten ver el giro) y cuerda de algodón.
- **Tipografía:** Fraunces (títulos) y Nunito (texto), incrustadas para que funcionen sin internet.
- **El color tiene significado:**
  - rojo: todo lo de la cuerda (F y τc);
  - verde azulado: todo lo de la fricción (f y τμ);
  - mostaza: el torque neto y el sentido de giro;
  - marrones: el peso y la normal.

## Guion de exposición
1. **Gancho:** con la cámara "Como el dibujo", pregunta: "Si jalo así (Caso B), ¿hacia dónde va?". Usa "Predice y verifica".
2. **Demostración:** con el Caso A y luego el B, tira de la cuerda a ½× o ⅕×. Señala Rc, Rμ, F y f.
3. **Torques en 3D:** cambia a la vista "3D" y gira la cámara. Muestra τc y τμ saliendo o entrando del plano, y aplica la regla de la mano derecha.
4. **Conclusión:** lee la tabla "¿qué torques entran y cuáles salen?".
5. **Momento wow (bonus):** sube Rc en el Caso A para mostrar el dato curioso. Después inclina la cuerda a 80° en el Caso B para la paradoja.
6. **Cierre:** "El sentido de giro lo decide la suma de torques respecto al punto de contacto, no la intuición".

Para los videos del taller, usa el botón **● Grabar** mientras tiras de la cuerda en cada caso.

## Skills usadas
- Búsqueda con `find-skills` (web + GitHub, porque skills.sh está bloqueado): no hay skills específicas de torques ni de rotación de cuerpo rígido. Las instaladas cubren el tema.
- `simulacion-cientifica`, `direccion-de-arte`, `physics-simulation`, `sympy`, `threejs-core-*`, `threejs-impl-lighting`, `threejs-impl-shadows`, `gsap-core`, `learning-experience`.
