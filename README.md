# Modelos-UNAL

Modelos interactivos para exposiciones y entregas de la universidad: simulaciones 3D, expo viva (scrollytelling), control por gestos, laboratorio con sensores, realidad aumentada y video programático.

Cada modelo es **un único archivo `index.html`** que se abre con doble clic y funciona **sin internet**. Incluye:

- variables manipulables con su explicación;
- un "Predice y verifica" para el público;
- calidad adaptativa con la casilla "Calidad alta";
- botones para grabar video y sacar capturas HD para el informe.

## Uso rápido
```bash
npm install
npm run nuevo -- fisica pendulo-simple   # crea modelos/fisica/pendulo-simple desde la plantilla
npm run empaquetar                        # genera los index.html
npm run probar                            # prueba en Chromium sin internet y guarda capturas en pruebas/
```

Ejemplo: `plantilla/index.html` (oscilador amortiguado).

## Modelos
_Todavía no hay modelos. El primero se agregará aquí._

Las reglas de trabajo y las herramientas para Claude están en [`CLAUDE.md`](CLAUDE.md).
