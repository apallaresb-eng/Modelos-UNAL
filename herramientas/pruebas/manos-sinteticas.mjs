// Genera manos sintéticas (21 puntos tipo MediaPipe) para probar el clasificador de gestos.
// Coordenadas de imagen: x → derecha, y ↓ abajo, z negativo = hacia la cámara.
const ARTICULACIONES = { indice: [-0.09, 0.46, 0.26, 0.2, 0.17], medio: [0.0, 0.48, 0.3, 0.22, 0.18], anular: [0.08, 0.45, 0.27, 0.2, 0.17], menique: [0.16, 0.4, 0.2, 0.15, 0.14] };
// [x de la base, alto de la base, largos de las 3 falanges]

function dedo([bx, alto, l1, l2, l3], curl) {
  // curl 0 = recto hacia arriba; 1 = completamente doblado hacia la palma.
  const angulos = [1.5 * curl, 1.75 * curl, 1.2 * curl];
  const pts = [{ x: bx, y: -alto, z: 0 }];
  let th = 0;
  for (const [i, l] of [l1, l2, l3].entries()) {
    th += angulos[i];
    const q = pts[pts.length - 1];
    pts.push({ x: q.x, y: q.y - l * Math.cos(th), z: q.z - l * Math.sin(th) });
  }
  return pts; // mcp, pip, dip, punta
}

function pulgar(modo, puntaIndice) {
  const base = [{ x: -0.12, y: -0.1, z: 0 }, { x: -0.22, y: -0.18, z: -0.02 }];
  let dir;
  if (modo === 'fuera') dir = { x: -0.78, y: -0.62 };
  else if (modo === 'arriba') dir = { x: -0.05, y: -1 };
  if (modo === 'pellizco') {
    // la punta del pulgar toca la punta del índice
    const m = base[1];
    const t = puntaIndice;
    const ip = { x: (m.x + t.x) / 2 - 0.03, y: (m.y + t.y) / 2, z: (m.z + t.z) / 2 };
    return [...base, ip, { x: t.x - 0.01, y: t.y + 0.01, z: t.z }];
  }
  if (modo === 'dentro') {
    // cruzado sobre la palma (puño)
    return [...base, { x: -0.12, y: -0.28, z: -0.12 }, { x: 0.0, y: -0.3, z: -0.16 }];
  }
  const ip = { x: base[1].x + dir.x * 0.17, y: base[1].y + dir.y * 0.17, z: -0.02 };
  return [...base, ip, { x: ip.x + dir.x * 0.15, y: ip.y + dir.y * 0.15, z: -0.02 }];
}

// pose: { curl: [i, m, a, me], pulgar: 'fuera'|'dentro'|'arriba'|'der'|'izq'|'pellizco' }
export function manoSintetica({ curl, pulgar: modoPulgar, rot: rotPose = 0 }, { rot: rotExtra = 0, escala = 0.22, cx = 0.5, cy = 0.55, ruido = 0.003, aleatorio = Math.random } = {}) {
  const muñeca = { x: 0, y: 0, z: 0 };
  const dedos = Object.values(ARTICULACIONES).map((a, i) => dedo(a, curl[i]));
  const pts = [muñeca, ...pulgar(modoPulgar, dedos[0][3]), ...dedos.flat()];
  const rot = rotPose + rotExtra;
  const c = Math.cos(rot); const s = Math.sin(rot);
  const g = () => (aleatorio() + aleatorio() + aleatorio() - 1.5) * ruido * 1.4;
  return pts.map((p) => ({
    x: cx + escala * (p.x * c - p.y * s) + g(),
    y: cy + escala * (p.x * s + p.y * c) + g(),
    z: escala * p.z + g(),
  }));
}

export const POSES = {
  abierta: { curl: [0, 0, 0, 0], pulgar: 'fuera' },
  puno: { curl: [1, 1, 1, 1], pulgar: 'dentro' },
  senalar: { curl: [0, 1, 1, 1], pulgar: 'dentro' },
  v: { curl: [0, 0, 1, 1], pulgar: 'dentro' },
  pellizco: { curl: [0.45, 0.1, 0.1, 0.1], pulgar: 'pellizco' },
  'pulgar-arriba': { curl: [1, 1, 1, 1], pulgar: 'arriba' },
  // Pulgar al lado = puño con pulgar arriba, con toda la mano girada 90° (como lo hace una mano real).
  'pulgar-der': { curl: [1, 1, 1, 1], pulgar: 'arriba', rot: Math.PI / 2 },
  'pulgar-izq': { curl: [1, 1, 1, 1], pulgar: 'arriba', rot: -Math.PI / 2 },
};
