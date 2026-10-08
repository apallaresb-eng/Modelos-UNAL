// Física del yoyo horizontal (carrete) jalado por una cuerda enrollada en su eje.
// Ejes: x → derecha, y ↑ arriba, z sale del plano del dibujo (hacia quien mira).
// Unidades SI. Rc = radio del eje donde está la cuerda, Rμ = radio exterior (contacto con el suelo).
//
// Ecuaciones (cuerpo rígido en el plano):
//   Traslación:  m·a = F·cosθ + f              (f = fricción, + hacia la derecha)
//   Normal:      N = m·g − F·senθ
//   Rotación:    I·α_z = τc + τf,  τc = (Rc·n̂) × F = −s·Rc·F,  τf = (−Rμ ŷ) × f x̂ = Rμ·f
//   Sin deslizar: v + ω_z·Rμ = 0  →  a = −Rμ·α_z
//   ⇒ a = F (cosθ + s·Rc/Rμ) / (m (1 + k)),  con I = k·m·Rμ²,  s = +1 (Caso A) o −1 (Caso B)
// Si la fricción requerida supera μ·N, el yoyo desliza y la fricción es cinética.

export const G = 9.8;

export function crearYoyo(p) {
  return { p: { ...p }, x: 0, v: 0, phi: 0, omega: 0, estado: 'quieto', f: 0, N: 0, a: 0, alpha: 0 };
}

// Lado de la cuerda: Caso A sale por ENCIMA del eje (s = +1), Caso B por DEBAJO (s = −1).
export const ladoCuerda = (caso) => (caso === 'A' ? 1 : -1);

// Punto de tangencia de la cuerda sobre el eje (relativo al centro) para una fuerza a ángulo θ.
export function puntoCuerda(caso, Rc, theta) {
  const s = ladoCuerda(caso);
  return { x: -s * Rc * Math.sin(theta), y: s * Rc * Math.cos(theta) };
}

// Fuerzas y torques instantáneos. tirando = si la mano está jalando la cuerda.
export function analizar(y, tirando) {
  const { m, Rmu, Rc, k, mu, caso, theta } = y.p;
  const F = tirando ? y.p.F : 0;
  const s = ladoCuerda(caso);
  const I = k * m * Rmu * Rmu;
  const Fx = F * Math.cos(theta);
  const tauC = -s * Rc * F; // componente z: negativo = entra al plano (⊗)
  const N = m * G - F * Math.sin(theta);
  const vContacto = y.v + y.omega * Rmu;

  if (N <= 0) return { F, Fx, tauC, tauF: 0, f: 0, N: 0, a: Fx / m, alpha: tauC / I, estado: 'levanta', fRodar: 0 };

  // Fricción que haría falta para rodar sin deslizar.
  const aRodar = (F * (Math.cos(theta) + (s * Rc) / Rmu)) / (m * (1 + k));
  const fRodar = m * aRodar - Fx;
  const quieto = Math.abs(y.v) < 1e-9 && F === 0;

  if (Math.abs(vContacto) < 1e-6 && Math.abs(fRodar) <= mu * N) {
    return { F, Fx, tauC, tauF: Rmu * fRodar, f: fRodar, N, a: aRodar, alpha: -aRodar / Rmu, estado: quieto ? 'quieto' : 'rueda', fRodar };
  }
  // Desliza: fricción cinética opuesta a la velocidad del punto de contacto.
  const dir = Math.abs(vContacto) > 1e-6 ? -Math.sign(vContacto) : Math.sign(fRodar);
  const f = dir * mu * N;
  return { F, Fx, tauC, tauF: Rmu * f, f, N, a: (Fx + f) / m, alpha: (tauC + Rmu * f) / I, estado: 'desliza', fRodar };
}

// Avanza dt segundos con sub-pasos. Dentro de cada sub-paso las fuerzas son constantes, así que
// se usa la cinemática exacta de aceleración constante (x += v·h + ½·a·h²); luego se re-proyecta
// a rodadura pura cuando corresponde.
export function avanzar(y, dt, tirando, subpasos = 8) {
  const h = dt / subpasos;
  let r;
  for (let i = 0; i < subpasos; i++) {
    r = analizar(y, tirando);
    const vAntes = y.v + y.omega * y.p.Rmu;
    y.x += y.v * h + 0.5 * r.a * h * h;
    y.phi += y.omega * h + 0.5 * r.alpha * h * h;
    y.v += r.a * h;
    y.omega += r.alpha * h;
    if (r.estado === 'rueda' || r.estado === 'quieto') y.omega = -y.v / y.p.Rmu;
    else if (r.estado === 'desliza' && vAntes * (y.v + y.omega * y.p.Rmu) < 0) {
      // El punto de contacto se detuvo dentro del sub-paso: vuelve a rodar.
      y.omega = -y.v / y.p.Rmu;
    }
  }
  Object.assign(y, { f: r.f, N: r.N, a: r.a, alpha: r.alpha, estado: r.estado });
  return r;
}

// Ángulo crítico de la paradoja del carrete (solo Caso B): cosθc = Rc/Rμ.
export const anguloCritico = (Rc, Rmu) => Math.acos(Math.min(1, Rc / Rmu));
