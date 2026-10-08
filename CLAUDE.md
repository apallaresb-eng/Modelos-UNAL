# Modelos-UNAL: reglas para Claude

Repo de **modelos interactivos para la universidad**: simulaciones 3D, expo viva (scrollytelling), control por gestos, laboratorio con sensores, realidad aumentada y video programático. El usuario estudia Ingeniería (2.º semestre) y también hace modelos para amigos de otras carreras. Presenta desde su portátil con video beam, entrega links al profesor y usa capturas o video en los informes. **Todo en español.**

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
nucleo/                     calidad adaptativa, panel de variables, predice y verifica, grabar/captura
herramientas/               empaquetar, validar, probar (Playwright sin red), nuevo-modelo, hooks
.claude/skills/             skills instaladas (ver skills-lock.json) + simulacion-cientifica + direccion-de-arte
.claude/agents/             revisor-cientifico · director-de-arte · qa-rendimiento
```

## Comandos
- `npm run nuevo -- <materia> <tema>`: crea un modelo desde la plantilla.
- `npm run empaquetar [-- carpeta]`: genera `index.html` autocontenido. El hook lo hace solo tras cada edición.
- `npm run validar [-- carpeta]`: revisa las reglas (sin red, núcleo, README con Fuente/Variables/Guion).
- `npm run probar [-- carpeta]`: Chromium sin internet, errores, FPS y capturas en `pruebas/` (ignorada por git).

## Notas
- **Nunca edites `index.html` a mano**: es generado; el hook lo rechaza.
- En la nube no hay GPU: los FPS de `probar` sirven para comparar niveles, no como valor real.
- La realidad aumentada en celular necesita el link publicado (HTTPS), no el archivo local.
- Manim y las skills científicas en Python (sympy, astropy, rdkit) requieren `pip install` del paquete cuando se usen.
