// Laboratorio con cámara: mide la FRACCIÓN ILUMINADA de una pelota real (montaje "lámpara + pelota").
// Sin IA: solo píxeles. Geometría: para una esfera iluminada desde una dirección, la parte iluminada
// vista de frente mide de alto el diámetro 2R (de cuerno a cuerno) y de ancho w = R(1 + cos i), así
// que k = w / 2R = (1 + cos i) / 2. Se mide con la forma del brillo, sin necesitar ver la parte oscura.
//
// analizarFotograma({ data, width, height }, { umbral, previo }) → medición | null   (función pura)
// crearSeguimiento({ video, espejo, alMedir })                    → bucle en el navegador

// Umbral de Otsu sobre el histograma de brillo (separa "iluminado" de "fondo").
export function umbralOtsu(hist, total) {
  let suma = 0;
  for (let i = 0; i < 256; i++) suma += i * hist[i];
  let sumaB = 0; let wB = 0; let mejor = 0; let umbral = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumaB += i * hist[i];
    const mB = sumaB / wB; const mF = (suma - sumaB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > mejor) { mejor = v; umbral = i; }
  }
  return umbral;
}

export function analizarFotograma({ data, width: W, height: H }, { umbral: umbralFijo, previo = null, minPix = 60 } = {}) {
  const lum = new Uint8Array(W * H);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const v = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    lum[j] = v; hist[v]++;
  }
  // Brillo del fondo (mediana) y del máximo (percentil 99,5): umbral bajo, justo por encima del fondo,
  // para no perder la zona tenue junto al terminador (con Lambert se apaga poco a poco).
  const percentil = (p) => { let acc = 0; const meta = p * W * H; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= meta) return v; } return 255; };
  const fondo = percentil(0.5);
  const maximo = percentil(0.995);
  let mad = 0; for (let v = 0; v < 256; v++) mad += hist[v] * Math.abs(v - fondo); mad /= W * H;
  const umbral = umbralFijo ?? Math.max(fondo + 3.5 * mad + 4, fondo + 0.08 * (maximo - fondo));
  const t = Math.min(0.5, Math.max(0.01, (umbral - fondo) / Math.max(1, maximo - fondo))); // fracción de Lambert del corte
  // Componentes conexas de píxeles brillantes; se elige la más grande (o la más cercana a la anterior).
  const marca = new Int32Array(W * H).fill(-1);
  const pila = new Int32Array(W * H);
  let mejor = null;
  let id = 0;
  for (let s = 0; s < W * H; s++) {
    if (lum[s] < umbral || marca[s] !== -1) continue;
    let n = 0; let sx = 0; let sy = 0; let tope = 0;
    pila[tope++] = s; marca[s] = id;
    const pix = [];
    while (tope) {
      const q = pila[--tope]; const x = q % W; const y = (q / W) | 0;
      n++; sx += x; sy += y; pix.push(q);
      for (const r of [q - 1, q + 1, q - W, q + W]) {
        if (r < 0 || r >= W * H || marca[r] !== -1 || lum[r] < umbral) continue;
        if ((r === q - 1 && x === 0) || (r === q + 1 && x === W - 1)) continue;
        marca[r] = id; pila[tope++] = r;
      }
    }
    if (n >= minPix) {
      const c = { n, cx: sx / n, cy: sy / n, pix };
      const puntaje = previo ? n / (1 + Math.hypot(c.cx - previo.cx, c.cy - previo.cy) / 20) : n;
      if (!mejor || puntaje > mejor.puntaje) mejor = { ...c, puntaje };
    }
    id++;
  }
  if (!mejor) return null;
  const dentro = new Uint8Array(W * H);
  for (const q of mejor.pix) dentro[q] = 1;
  // 1. Borde de la mancha → círculo del limbo. El terminador queda DENTRO del disco, así que se
  //    ajusta un círculo (Kåsa) y se descartan iterativamente los puntos interiores.
  let borde = [];
  for (const q of mejor.pix) {
    const x = q % W; const y = (q / W) | 0;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !dentro[q - 1] || !dentro[q + 1] || !dentro[q - W] || !dentro[q + W]) borde.push([x, y]);
  }
  let c = { x: mejor.cx, y: mejor.cy, r: Math.sqrt(mejor.n / Math.PI) };
  for (let it = 0; it < 8 && borde.length >= 8; it++) {
    c = ajustarCirculo(borde) ?? c;
    const dist = borde.map(([x, y]) => Math.hypot(x - c.x, y - c.y));
    const corte = c.r - Math.max(1.2, 0.04 * c.r);
    const siguiente = borde.filter((_, i) => dist[i] >= corte);
    if (siguiente.length === borde.length || siguiente.length < 8) break;
    borde = siguiente;
  }
  const R = c.r;
  // 2. Eje de la luz: del centro del disco hacia el centro de la mancha iluminada.
  let ax = mejor.cx - c.x; let ay = mejor.cy - c.y;
  const largoEje = Math.hypot(ax, ay);
  const casiLlena = largoEje < 0.04 * R;
  if (casiLlena) { ax = 1; ay = 0; } else { ax /= largoEje; ay /= largoEje; }
  // 3. Borde iluminado más lejano del limbo, en la franja que pasa por el centro (|perp| < 0,15 R).
  let nMin = 1;
  for (const q of mejor.pix) {
    const dx = (q % W) - c.x; const dy = ((q / W) | 0) - c.y;
    if (Math.abs(-dx * ay + dy * ax) > 0.15 * R) continue;
    const n = (dx * ax + dy * ay) / R;
    if (n < nMin) nMin = n;
  }
  // 4. Estimación inicial con Lambert: en el borde medido, cos(θe − i) = t  →  i = θe + acos(t).
  const thetaE = Math.asin(Math.max(-1, Math.min(1, nMin)));
  const i0 = casiLlena ? 0.2 : Math.max(0, Math.min(Math.PI, thetaE + Math.acos(t)));
  // 5. Ajuste fino: se busca la esfera iluminada (centro, radio, fase, dirección de la luz y corte)
  //    cuya silueta brillante coincide mejor (IoU) con la observada. Corrige los cuernos tenues.
  const ajuste = ajustarModelo(dentro, W, H, { cx: c.x, cy: c.y, R, i: i0, dir: Math.atan2(ay, ax), t }, lum, umbral);
  const i = ajuste.i;
  const k = (1 + Math.cos(i)) / 2;
  c.x = ajuste.cx; c.y = ajuste.cy;
  if (!casiLlena || ajuste.i > 0.3) { ax = Math.cos(ajuste.dir); ay = Math.sin(ajuste.dir); }
  return {
    k, angulo: i, // ángulo de fase i (0 = llena, π = nueva)
    centro: { x: c.x, y: c.y }, radio: ajuste.R, pixeles: mejor.n, umbral, coincidencia: ajuste.iou,
    luzDesde: k > 0.97 ? { x: 0, y: 0 } : { x: ax, y: ay }, // dirección (en la imagen) de donde viene la luz
    // Rango válido verificado: k ≥ 0,25 (de llena a creciente gruesa). Las crecientes muy delgadas
    // son tenues (brillo máx. = sen i) y de pocos píxeles: se marcan como poco confiables.
    confiable: k >= 0.25 && ajuste.iou >= 0.85,
    incertidumbre: Math.min(0.5, 1.5 / ajuste.R + 0.02 + (1 - ajuste.iou) * 0.3 + (k < 0.25 ? 0.1 : 0)), // cuantización + borde + ajuste
    cx: mejor.cx, cy: mejor.cy,
  };
}

// Silueta iluminada de una esfera: píxel brillante si N·L ≥ t (N normal visible, L luz con fase i).
function iouModelo(dentro, W, H, m) {
  const ux = Math.cos(m.dir); const uy = Math.sin(m.dir);
  const Lx = Math.sin(m.i) * ux; const Ly = Math.sin(m.i) * uy; const Lz = Math.cos(m.i);
  const x0 = Math.max(0, Math.floor(m.cx - m.R - 2)); const x1 = Math.min(W - 1, Math.ceil(m.cx + m.R + 2));
  const y0 = Math.max(0, Math.floor(m.cy - m.R - 2)); const y1 = Math.min(H - 1, Math.ceil(m.cy + m.R + 2));
  let inter = 0; let union = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x - m.cx) / m.R; const dy = (y - m.cy) / m.R; const r2 = dx * dx + dy * dy;
    const pred = r2 <= 1 && dx * Lx + dy * Ly + Math.sqrt(1 - r2) * Lz >= m.t;
    const obs = dentro[y * W + x] === 1;
    if (pred && obs) inter++;
    if (pred || obs) union++;
  }
  return union ? inter / union : 0;
}

// Regresión fotométrica de Lambert sobre los píxeles iluminados: I = a + b·(N·L).
// Con a y b se despeja el corte real t = (umbral − a) / b (así la forma no depende de adivinar t).
function corteLambert(lum, dentro, W, H, m, umbral) {
  const ux = Math.cos(m.dir); const uy = Math.sin(m.dir);
  const Lx = Math.sin(m.i) * ux; const Ly = Math.sin(m.i) * uy; const Lz = Math.cos(m.i);
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  const x0 = Math.max(0, Math.floor(m.cx - m.R)); const x1 = Math.min(W - 1, Math.ceil(m.cx + m.R));
  const y0 = Math.max(0, Math.floor(m.cy - m.R)); const y1 = Math.min(H - 1, Math.ceil(m.cy + m.R));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!dentro[y * W + x]) continue;
    const dx = (x - m.cx) / m.R; const dy = (y - m.cy) / m.R; const r2 = dx * dx + dy * dy;
    if (r2 > 0.92) continue; // lejos del borde (píxeles mezclados con el fondo)
    const nl = dx * Lx + dy * Ly + Math.sqrt(1 - r2) * Lz;
    if (nl <= 0) continue;
    const I = lum[y * W + x];
    n++; sx += nl; sy += I; sxx += nl * nl; sxy += nl * I;
  }
  const den = n * sxx - sx * sx;
  if (n < 30 || Math.abs(den) < 1e-6) return m.t;
  const b = (n * sxy - sx * sy) / den;
  const a = (sy - b * sx) / n;
  if (b <= 1) return m.t;
  return Math.max(0.01, Math.min(0.8, (umbral - a) / b));
}

// Descenso por coordenadas con pasos que se refinan, alternando con la regresión fotométrica.
function ajustarModelo(dentro, W, H, inicial, lum, umbral) {
  let m = { ...inicial, t: Math.max(0.03, Math.min(0.6, inicial.t)) };
  let mejor = iouModelo(dentro, W, H, m);
  // Barrido global de la fase (cada 3°), con el corte t recalculado por fotometría en cada una:
  // evita quedarse atascado en un óptimo local con las crecientes delgadas.
  if (lum) {
    for (let g = 0; g <= 180; g += 3) {
      const prueba = { ...m, i: (g * Math.PI) / 180 };
      prueba.t = corteLambert(lum, dentro, W, H, prueba, umbral);
      const v = iouModelo(dentro, W, H, prueba);
      if (v > mejor) { mejor = v; m = prueba; }
    }
  }
  const pasos = { cx: 0.12, cy: 0.12, R: 0.1, i: 0.35, dir: 0.3 };
  for (let ronda = 0; ronda < 8; ronda++) {
    if (lum && ronda % 2 === 0) { m = { ...m, t: corteLambert(lum, dentro, W, H, m, umbral) }; mejor = iouModelo(dentro, W, H, m); }
    for (const p of ['i', 'R', 'cx', 'cy', 'dir']) {
      const paso = ['cx', 'cy', 'R'].includes(p) ? pasos[p] * m.R : pasos[p];
      for (const s of [-1, 1]) {
        for (let n = 0; n < 6; n++) {
          const prueba = { ...m, [p]: m[p] + s * paso };
          if (p === 'i') prueba.i = Math.max(0, Math.min(Math.PI, prueba.i));
          const v = iouModelo(dentro, W, H, prueba);
          if (v > mejor) { mejor = v; m = prueba; } else break;
        }
      }
    }
    for (const p in pasos) pasos[p] *= 0.6;
  }
  return { ...m, iou: mejor };
}

// Ajuste algebraico de círculo (Kåsa): minimiza Σ(x² + y² + Dx + Ey + F)².
function ajustarCirculo(puntos) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
  const n = puntos.length;
  for (const [x, y] of puntos) {
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z;
  }
  // Sistema 3×3: [sxx sxy sx; sxy syy sy; sx sy n]·[D E F] = −[sxz syz sz]
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const b = [-sxz, -syz, -sz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D0 = det(A);
  if (Math.abs(D0) < 1e-9) return null;
  const col = (k) => A.map((fila, i) => fila.map((v, j) => (j === k ? b[i] : v)));
  const D = det(col(0)) / D0; const E = det(col(1)) / D0; const F = det(col(2)) / D0;
  const x = -D / 2; const y = -E / 2;
  const r2 = x * x + y * y - F;
  return r2 > 0 ? { x, y, r: Math.sqrt(r2) } : null;
}

// Bucle en el navegador: reduce la imagen a 320 px, mide y promedia los últimos fotogramas.
export function crearSeguimiento({ video, espejo = true, alMedir = () => {}, ancho = 320 }) {
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  let corriendo = true; let previo = null; let umbral;
  const historia = [];
  const bucle = () => {
    if (!corriendo) return;
    if (video.readyState >= 2 && video.videoWidth) {
      lienzo.width = ancho; lienzo.height = Math.round((ancho * video.videoHeight) / video.videoWidth);
      ctx.save();
      if (espejo) { ctx.translate(lienzo.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
      ctx.restore();
      const m = analizarFotograma(ctx.getImageData(0, 0, lienzo.width, lienzo.height), { umbral, previo });
      if (m) {
        previo = m;
        historia.push(m.k); if (historia.length > 15) historia.shift();
        const media = historia.reduce((a, b) => a + b, 0) / historia.length;
        const desv = Math.sqrt(historia.reduce((a, b) => a + (b - media) ** 2, 0) / historia.length);
        alMedir({ ...m, kMedia: media, incertidumbre: Math.max(m.incertidumbre, desv), ancho: lienzo.width, alto: lienzo.height });
      } else alMedir(null);
    }
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
  const api = {
    lienzo,
    fijarUmbral(u) { umbral = u; },
    reiniciar() { previo = null; historia.length = 0; },
    detener() { corriendo = false; },
  };
  (window.__modelo ??= {}).seguimiento = api;
  return api;
}
