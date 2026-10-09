// Astronomía de las fases de la Luna (puro: se prueba en Node con fases-luna.test.mjs).
// Convención: "edad angular" E ∈ [0°, 360°) = elongación eclíptica Luna−Sol:
//   0° nueva · 90° cuarto creciente · 180° llena · 270° cuarto menguante.
// Fracción iluminada (ángulo de fase i ≈ 180° − E, despreciando el paralaje): k = (1 + cos i)/2 = (1 − cos E)/2.
import * as Astronomy from 'astronomy-engine';

export const MES_SINODICO = 29.530588853; // días (fase a fase) — Meeus, Astronomical Algorithms, cap. 49
export const MES_SIDEREO = 27.321661; // días (respecto a las estrellas)
export const INCLINACION_ORBITA = 5.145; // grados respecto a la eclíptica
export const OBLICUIDAD = 23.4393; // grados (eje de la Tierra respecto a la eclíptica, J2000)
export const LIMITE_ECLIPSE_LUNAR = 1.0; // |latitud eclíptica de la Luna| en llena para eclipse (penumbral ≈ 1,0°)
export const BOGOTA = { latitud: 4.711, longitud: -74.0721, altura: 2640 };

const rad = (g) => (g * Math.PI) / 180;
const grados = (r) => (r * 180) / Math.PI;
const normalizar = (g) => ((g % 360) + 360) % 360;

export const fraccionIluminada = (E) => (1 - Math.cos(rad(E))) / 2;
export const edadDias = (E) => (normalizar(E) / 360) * MES_SINODICO;

export function nombreFase(E) {
  const e = normalizar(E);
  if (e < 6 || e >= 354) return 'Luna nueva';
  if (e < 84) return 'Creciente';
  if (e < 96) return 'Cuarto creciente';
  if (e < 174) return 'Gibosa creciente';
  if (e < 186) return 'Luna llena';
  if (e < 264) return 'Gibosa menguante';
  if (e < 276) return 'Cuarto menguante';
  return 'Menguante';
}

// Latitud eclíptica de la Luna en el modelo simple: órbita inclinada con nodo ascendente en Ω.
// u = longitud de la Luna − Ω (argumento de latitud).
export const latitudLuna = (lonLuna, nodo, incl = INCLINACION_ORBITA) => grados(Math.asin(Math.sin(rad(incl)) * Math.sin(rad(lonLuna - nodo))));

// ¿Hay eclipse lunar en esta luna llena? (solo si la Luna pasa cerca de la sombra)
export const hayEclipseLunar = (E, beta) => Math.abs(normalizar(E) - 180) < 1.5 && Math.abs(beta) < LIMITE_ECLIPSE_LUNAR;

// La Luna REAL en una fecha (efemérides de astronomy-engine, precisión de minutos de arco).
export function lunaEnFecha(fecha = new Date(), lugar = BOGOTA) {
  const t = Astronomy.MakeTime(fecha);
  const E = Astronomy.MoonPhase(t);
  const ilum = Astronomy.Illumination(Astronomy.Body.Moon, t);
  const obs = new Astronomy.Observer(lugar.latitud, lugar.longitud, lugar.altura);
  const eqLuna = Astronomy.Equator(Astronomy.Body.Moon, t, obs, true, true);
  const eqSol = Astronomy.Equator(Astronomy.Body.Sun, t, obs, true, true);
  const hor = Astronomy.Horizon(t, obs, eqLuna.ra, eqLuna.dec, 'normal');
  const beta = Astronomy.EclipticGeoMoon(t).lat;
  return {
    E, k: ilum.phase_fraction, nombre: nombreFase(E), edad: edadDias(E), beta,
    altura: hor.altitude, azimut: hor.azimuth,
    limbo: anguloLimboDesdeCenit(eqSol, eqLuna, Astronomy.SiderealTime(t), lugar),
    siguienteLlena: Astronomy.SearchMoonPhase(180, t, 40)?.date ?? null,
    siguienteNueva: Astronomy.SearchMoonPhase(0, t, 40)?.date ?? null,
  };
}

// Ángulo del borde iluminado medido desde el CÉNIT del observador (0° = la luz llega desde arriba,
// 90° = desde la izquierda/este hacia… se usa para girar el dibujo de la Luna tal como se ve en el cielo).
// χ: ángulo de posición del limbo brillante (desde el norte celeste, hacia el este) — Meeus, ec. 48.5.
// q: ángulo paraláctico — Meeus, ec. 14.1.  Ángulo desde el cénit = χ − q.
export function anguloLimboDesdeCenit(eqSol, eqLuna, tsg, lugar = BOGOTA) {
  const aS = rad(eqSol.ra * 15); const dS = rad(eqSol.dec);
  const aM = rad(eqLuna.ra * 15); const dM = rad(eqLuna.dec);
  const chi = Math.atan2(Math.cos(dS) * Math.sin(aS - aM), Math.sin(dS) * Math.cos(dM) - Math.cos(dS) * Math.sin(dM) * Math.cos(aS - aM));
  const H = rad((tsg + lugar.longitud / 15 - eqLuna.ra) * 15); // ángulo horario de la Luna
  const phi = rad(lugar.latitud);
  const q = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(dM) - Math.sin(dM) * Math.cos(H));
  return normalizar(grados(chi - q));
}
