// Pelota iluminada sintética (Lambert + ambiente + ruido + fondo con textura) para probar el laboratorio.
let semilla = 3;
export const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

// Imagen W×H con una esfera de radio R en (cx, cy), luz a ángulo de fase i (0 = llena, π = nueva)
// que llega desde la dirección `desde` (ángulo en la imagen). Devuelve { data, width, height }.
export function pelotaSintetica({ W = 320, H = 180, cx = 160, cy = 92, R = 42, i, desde = 0, ambiente = 0.05, ruido = 6, fondo = 35 }) {
  const data = new Uint8ClampedArray(W * H * 4);
  // Luz: vector en coordenadas de la vista (x derecha, y abajo, z hacia la cámara).
  const L = { x: Math.sin(i) * Math.cos(desde), y: Math.sin(i) * Math.sin(desde), z: Math.cos(i) };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - cx) / R; const dy = (y - cy) / R; const r2 = dx * dx + dy * dy;
    let v = fondo + (azar() - 0.5) * ruido * 2 + 10 * Math.sin(x / 23) * Math.cos(y / 17); // fondo con textura
    if (r2 <= 1) {
      const nz = Math.sqrt(1 - r2);
      const lambert = Math.max(0, dx * L.x + dy * L.y + nz * L.z);
      v = 255 * Math.min(1, ambiente + 0.92 * lambert) + (azar() - 0.5) * ruido * 2;
    }
    const j = (y * W + x) * 4;
    data[j] = v * 1.02; data[j + 1] = v; data[j + 2] = v * 0.95; data[j + 3] = 255;
  }
  return { data, width: W, height: H };
}

