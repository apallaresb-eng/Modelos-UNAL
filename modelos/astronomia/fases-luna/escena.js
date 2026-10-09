// Cuerpos celestes del modelo. Unidades: radio terrestre = 1. Marco eclíptico centrado en la Tierra:
// plano XZ = eclíptica, +Y = norte de la eclíptica. Las distancias se comprimen (ver ESCALA) pero la luz,
// las sombras y las fases se calculan con la geometría real de cada posición.
import * as THREE from 'three';
import texDia from '@recursos/planetas/earth_day_4096_2048.webp';
import texNoche from '@recursos/planetas/earth_night_4096_2048.webp';
import texNubes from '@recursos/planetas/earth_clouds_1024.png';
import texEspecular from '@recursos/planetas/earth_specular_2048_1024.webp';
import texNormal from '@recursos/planetas/earth_normal_2048_1024.webp';
import texLuna from '@recursos/planetas/moon_lroc_4096.webp'; // LROC WAC, CGI Moon Kit (NASA SVS 4720)
import texRelieve from '@recursos/planetas/moon_normal_lola_2048.webp'; // normales del relieve LOLA (mismo kit)
import catalogo from '@recursos/estrellas/estrellas-mag6.json';
import { OBLICUIDAD } from './astro.js';

export const ESCALA = {
  radioLuna: 0.2727, // 1737 km / 6371 km (real)
  distanciaLuna: 14, // real: 60,3 radios terrestres (comprimida ×4,3 para verla junto a la Tierra)
  distanciaLunaReal: 60.3,
  longitudUmbra: 217, // radios terrestres (real ≈ 1,38 millones de km)
};

const cargador = new THREE.TextureLoader();
const textura = (url, srgb = true) => { const t = cargador.load(url); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- Tierra: día/noche + mar brillante + nubes + atmósfera ----------
export function crearTierra(uniformesSol) {
  const grupo = new THREE.Group();
  const eje = new THREE.Group(); // inclinación del eje (23,44°)
  eje.rotation.z = -THREE.MathUtils.degToRad(OBLICUIDAD);
  grupo.add(eje);
  const materialTierra = new THREE.ShaderMaterial({
    uniforms: {
      ...uniformesSol,
      dia: { value: textura(texDia) }, noche: { value: textura(texNoche) },
      especular: { value: textura(texEspecular, false) }, normal: { value: textura(texNormal, false) },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vT;
      void main() {
        vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
        vT = normalize(mat3(modelMatrix) * vec3(-position.z, 0.0, position.x));
        vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D dia, noche, especular, normal; uniform vec3 dirSol;
      varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vT;
      void main() {
        vec3 n0 = normalize(vN); vec3 t = normalize(vT - n0 * dot(vT, n0)); vec3 b = cross(n0, t);
        vec3 nm = texture2D(normal, vUv).xyz * 2.0 - 1.0;
        vec3 n = normalize(t * nm.x * 0.6 + b * nm.y * 0.6 + n0 * nm.z);
        float luz = dot(n, dirSol);
        float diaF = smoothstep(-0.2, 0.25, dot(n0, dirSol));
        vec3 cDia = texture2D(dia, vUv).rgb * smoothstep(-0.15, 0.6, luz) * max(luz + 0.12, 0.0) * 1.05;
        vec3 cNoche = texture2D(noche, vUv).rgb * vec3(1.0, 0.82, 0.55) * 1.6;
        vec3 v = normalize(cameraPosition - vPos);
        float mar = texture2D(especular, vUv).r;
        float brillo = pow(max(dot(reflect(-dirSol, n0), v), 0.0), 180.0) * mar * 1.5 * step(0.0, luz);
        vec3 c = mix(cNoche, cDia, diaF) + vec3(1.0, 0.92, 0.8) * brillo;
        // línea del amanecer/atardecer con un tono cálido
        c *= mix(vec3(1.0), vec3(1.0, 0.72, 0.5), exp(-pow((dot(n0, dirSol) - 0.04) * 9.0, 2.0)) * 0.5);
        float borde = pow(1.0 - max(dot(n0, v), 0.0), 2.2);
        c = mix(c, vec3(0.32, 0.55, 0.95) * smoothstep(-0.1, 0.5, dot(n0, dirSol)), borde * 0.45); // dispersión de Rayleigh
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const tierra = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), materialTierra);
  eje.add(tierra);
  const nubesTex = textura(texNubes);
  const nubes = new THREE.Mesh(new THREE.SphereGeometry(1.008, 96, 72), new THREE.ShaderMaterial({
    uniforms: { ...uniformesSol, nubes: { value: nubesTex } },
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D nubes; uniform vec3 dirSol; varying vec2 vUv; varying vec3 vN;
      void main(){
        float a = texture2D(nubes, vUv).a; // las nubes vienen en el canal alfa
        float l = smoothstep(-0.08, 0.3, dot(normalize(vN), dirSol));
        gl_FragColor = vec4(vec3(1.0) * (0.02 + 0.98 * l), a * 0.85 * (0.15 + 0.85 * l));
      #include <colorspace_fragment>
      }`,
  }));
  eje.add(nubes);
  // Atmósfera: halo azul en el borde (Fresnel), más intenso del lado del día.
  const atmosfera = new THREE.Mesh(new THREE.SphereGeometry(1.03, 96, 72), new THREE.ShaderMaterial({
    uniforms: { ...uniformesSol },
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vPos; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vPos=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 dirSol; varying vec3 vN; varying vec3 vPos;
      void main(){ vec3 v = normalize(cameraPosition - vPos); float f = pow(1.0 - abs(dot(normalize(vN), v)), 4.0);
        float mu = dot(normalize(vN), dirSol);
        float dia = smoothstep(-0.25, 0.35, mu);
        float ocaso = exp(-pow((mu + 0.02) * 7.0, 2.0)); // franja cálida donde el limbo cruza el terminador
        vec3 col = mix(vec3(0.3, 0.58, 1.0), vec3(0.95, 0.5, 0.3), ocaso * 0.5);
        gl_FragColor = vec4(col * f * 1.9 * max(dia, ocaso * 0.18), f); }`,
  }));
  grupo.add(atmosfera);
  return { grupo, tierra, nubes, eje };
}

// ---------- Luna: reflectancia Lommel–Seeliger + relieve + luz cenicienta + eclipse ----------
export function crearLuna(uniformesSol) {
  const uniformes = {
    ...uniformesSol,
    mapa: { value: textura(texLuna) }, relieve: { value: textura(texRelieve, false) },
    cenicienta: { value: 0.1 }, sombraTierra: { value: 1 }, longitudUmbra: { value: ESCALA.longitudUmbra },
  };
  const material = new THREE.ShaderMaterial({
    uniforms: uniformes,
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vT;
      void main() {
        vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
        vT = normalize(mat3(modelMatrix) * vec3(-position.z, 0.0, position.x));
        vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D mapa, relieve; uniform vec3 dirSol; uniform float cenicienta, sombraTierra, longitudUmbra;
      varying vec2 vUv; varying vec3 vN; varying vec3 vPos; varying vec3 vT;
      void main() {
        vec3 n0 = normalize(vN); vec3 t = normalize(vT - n0 * dot(vT, n0)); vec3 b = cross(n0, t);
        // relieve real (LOLA): mapa de normales en el espacio tangente (x = este, y = norte)
        vec3 nm = texture2D(relieve, vUv).xyz * 2.0 - 1.0;
        vec3 n = normalize(-t * nm.x - b * nm.y + n0 * nm.z / 1.1);
        vec3 v = normalize(cameraPosition - vPos);
        // La geometría (normal lisa) decide DÓNDE llega la luz; el relieve solo la matiza cerca del
        // terminador, donde la luz rasante hace que los cráteres proyecten sombra.
        float mu0Liso = dot(n0, dirSol);
        float rasante = 1.0 - smoothstep(0.0, 0.2, mu0Liso);
        float mu0 = max(mix(mu0Liso, dot(n, dirSol), 0.15 + 0.55 * rasante), 0.0) * smoothstep(-0.02, 0.03, mu0Liso)
          + 0.012 * smoothstep(-0.05, 0.05, mu0Liso); // relleno: luz reflejada por las paredes de los cráteres
        float mu = max(dot(n0, v), 0.0);
        float ls = mu0 / (mu0 + mu + 1e-4) * 2.0; // Lommel–Seeliger: la llena se ve plana, terminador nítido
        vec3 albedo = texture2D(mapa, vUv).rgb;
        // Sombra de la Tierra (cono de umbra y penumbra a lo largo de −dirSol)
        float d = dot(vPos, -dirSol);
        float r = length(vPos + dirSol * d);
        float ru = 1.0 - d / longitudUmbra; float rp = 1.0 + d * 0.0046;
        float enSombra = d > 0.0 ? 1.0 - smoothstep(ru, rp, r) : 0.0;
        float umbra = d > 0.0 ? 1.0 - smoothstep(ru - 0.05, ru + 0.05, r) : 0.0;
        vec3 sol = vec3(1.0) * ls * 1.2 * mix(1.0, 1.0 - enSombra * 0.7, sombraTierra);
        vec3 rojo = vec3(0.55, 0.16, 0.06) * umbra * sombraTierra * 0.35 * (0.4 + 0.6 * max(dot(n0, dirSol) * -1.0 + 1.0, 0.0));
        // Luz cenicienta: la luz del Sol reflejada por la Tierra. Llega DESDE la Tierra (en el origen) y crece con la
        // fase de la Tierra vista desde la Luna, k⊕ = (1 + û·ŝ)/2 (û: Tierra→Luna). La cara oculta nunca la recibe.
        vec3 dirTierra = normalize(-vPos);
        float kTierra = 0.5 * (1.0 + dot(-dirTierra, dirSol));
        float mu0T = max(dot(n0, dirTierra), 0.0);
        float lsT = mu0T / (mu0T + mu + 1e-4) * 2.0;
        vec3 ceniza = cenicienta * kTierra * lsT * vec3(0.55, 0.68, 1.0);
        vec3 c = albedo * (sol * (1.0 - umbra * sombraTierra) + rojo + ceniza);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const luna = new THREE.Mesh(new THREE.SphereGeometry(ESCALA.radioLuna, 128, 96), material);
  return { luna, uniformes };
}

// ---------- Sol: núcleo + resplandor + rayos (el bloom del post-procesado hace el resto) ----------
export function crearSol() {
  const lienzo = Object.assign(document.createElement('canvas'), { width: 512, height: 512 });
  const g = lienzo.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,255,250,1)'); grad.addColorStop(0.06, 'rgba(255,246,220,1)');
  grad.addColorStop(0.12, 'rgba(255,214,140,0.55)'); grad.addColorStop(0.35, 'rgba(255,170,80,0.12)'); grad.addColorStop(1, 'rgba(255,140,60,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { // rayos de difracción
    g.save(); g.translate(256, 256); g.rotate((i * Math.PI) / 6);
    const r = g.createLinearGradient(-256, 0, 256, 0);
    r.addColorStop(0, 'rgba(255,220,170,0)'); r.addColorStop(0.5, 'rgba(255,235,200,0.28)'); r.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = r; g.fillRect(-256, -1.5, 512, 3); g.restore();
  }
  const tex = new THREE.CanvasTexture(lienzo); tex.colorSpace = THREE.SRGBColorSpace;
  const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: new THREE.Color(4, 3.6, 3) }));
  sol.scale.setScalar(160);
  return sol;
}

// ---------- Estrellas reales (catálogo hasta magnitud 6, color según el índice B−V) ----------
function colorBV(bv) { // Ballesteros (2012): B−V → temperatura → color aproximado
  const T = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  const c = new THREE.Color();
  if (T > 9000) c.setRGB(0.72, 0.8, 1); else if (T > 7000) c.setRGB(0.88, 0.92, 1); else if (T > 5800) c.setRGB(1, 0.98, 0.94);
  else if (T > 4800) c.setRGB(1, 0.9, 0.75); else c.setRGB(1, 0.78, 0.6);
  return c;
}
export function crearEstrellas(radio = 1500) {
  const n = catalogo.length;
  const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3); const tam = new Float32Array(n);
  const eps = THREE.MathUtils.degToRad(OBLICUIDAD);
  catalogo.forEach(([ra, dec, mag, bv], i) => {
    const a = THREE.MathUtils.degToRad(ra); const d = THREE.MathUtils.degToRad(dec);
    const x = Math.cos(d) * Math.cos(a); const y = Math.cos(d) * Math.sin(a); const z = Math.sin(d);
    const ye = y * Math.cos(eps) + z * Math.sin(eps); const ze = -y * Math.sin(eps) + z * Math.cos(eps); // ecuatorial → eclíptica
    pos.set([x * radio, ze * radio, -ye * radio], i * 3);
    const c = colorBV(bv); col.set([c.r, c.g, c.b], i * 3);
    tam[i] = Math.max(1.6, 6.5 * Math.pow(10, -0.4 * (mag - 1)) ** 0.45); // tamaño aparente según la magnitud
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('tam', new THREE.BufferAttribute(tam, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { escalaPx: { value: 1 }, brillo: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float tam; varying vec3 vC; varying float vT; uniform float escalaPx;
      void main(){ vC = color; vT = tam; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = tam * escalaPx * 1.6; }`,
    fragmentShader: `varying vec3 vC; varying float vT; uniform float brillo;
      void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-d * d * 4.0); gl_FragColor = vec4(vC * a * brillo * (0.55 + min(1.4, vT * 0.35)), a); }`,
    vertexColors: true,
  });
  return new THREE.Points(geo, mat);
}

// ---------- Sombra de la Tierra (cono de umbra), visible en el paso del error común ----------
export function crearSombra() {
  const largo = 26;
  const geo = new THREE.CylinderGeometry(1 - largo / ESCALA.longitudUmbra, 1, largo, 64, 1, true);
  geo.translate(0, -largo / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { opacidad: { value: 0 } },
    vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float opacidad; varying float vY; void main(){ float a = opacidad * (0.35 * smoothstep(-26.0, -1.0, vY)); gl_FragColor = vec4(1.0, 0.36, 0.45, a); }`,
  });
  return new THREE.Mesh(geo, mat);
}

// ---------- Vía Láctea tenue: banda en el plano galáctico real (polo norte galáctico: AR 192,86°, Dec +27,13°) ----------
// Brillo procedural (ruido fractal) que se concentra hacia el centro galáctico (AR 266,4°, Dec −28,9°, en Sagitario).
export function crearViaLactea(uniformesSol, radio = 1400) {
  const eps = THREE.MathUtils.degToRad(OBLICUIDAD);
  const aEscena = (raG, decG) => { // ecuatorial → eclíptica → ejes de la escena (igual que las estrellas)
    const a = THREE.MathUtils.degToRad(raG); const d = THREE.MathUtils.degToRad(decG);
    const x = Math.cos(d) * Math.cos(a); const y = Math.cos(d) * Math.sin(a); const z = Math.sin(d);
    const ye = y * Math.cos(eps) + z * Math.sin(eps); const ze = -y * Math.sin(eps) + z * Math.cos(eps);
    return new THREE.Vector3(x, ze, -ye);
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...uniformesSol, polo: { value: aEscena(192.86, 27.13) }, centro: { value: aEscena(266.4, -28.94) }, brillo: { value: 1 } },
    side: THREE.BackSide, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 polo, centro, dirSol; uniform float brillo; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float ruido(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * ruido(p); p *= 2.03; a *= 0.5; } return s; }
      // Estrellas no resueltas: un punto débil por celda, con probabilidad según la densidad de la banda
      float debiles(vec3 d, float dens){ vec3 g = d * 700.0; vec3 i = floor(g); vec3 f = fract(g);
        vec3 p = vec3(h(i), h(i + 13.1), h(i + 27.7)) * 0.6 + 0.2; float dd = length(f - p);
        return step(1.0 - dens, h(i + 51.3)) * exp(-dd * dd * 18.0) * (0.25 + 0.75 * h(i + 77.7)); }
      void main(){
        vec3 d = normalize(vD);
        float b = asin(clamp(dot(d, polo), -1.0, 1.0)); // latitud galáctica
        vec3 e1 = normalize(centro - polo * dot(centro, polo)); vec3 e2 = cross(polo, e1);
        float l = atan(dot(d, e2), dot(d, e1)); // longitud galáctica (0 = centro, en Sagitario)
        float nucleo = exp(-pow(l / 0.5, 2.0) - pow(b / 0.2, 2.0));
        float banda = exp(-pow(b / (0.07 + 0.06 * exp(-pow(l / 0.9, 2.0))), 2.0));
        // Luz zodiacal: polvo interplanetario que dispersa la luz del Sol, a lo largo de la eclíptica (plano y = 0)
        float cosSol = dot(d, dirSol); float latEcl = asin(clamp(d.y, -1.0, 1.0));
        float zodiacal = pow(max(cosSol, 0.0), 2.5) * exp(-pow(latEcl / (0.12 + 0.35 * max(cosSol, 0.0)), 2.0));
        vec3 zod = vec3(1.0, 0.78, 0.52) * zodiacal * 0.045 * brillo;
        if (banda < 0.004) { gl_FragColor = vec4(zod, 1.0); return; } // fuera de la banda: nada que calcular
        vec3 q = vec3(cos(l) * 5.0, sin(l) * 5.0, b * 9.0); // ruido estirado a lo largo del plano
        float nubes = fbm(q * 1.6) * (0.45 + 0.55 * fbm(q * 7.0)) * (0.7 + 0.3 * ruido(q * 26.0));
        float bordes = fbm(q * 3.0 + 7.0) + 0.18 * (ruido(q * 14.0) - 0.5);
        float grieta = smoothstep(0.5, 0.56, bordes) * exp(-pow((b - 0.01) / 0.04, 2.0)); // Gran Grieta: polvo con bordes nítidos
        float I = banda * pow(nubes, 1.8) * 2.4 * (0.55 + 2.2 * nucleo) * (1.0 - 0.85 * grieta);
        float puntos = debiles(d, clamp(banda * pow(nubes, 1.5) * 0.7, 0.0, 0.35)) * (1.0 - 0.9 * grieta);
        vec3 col = mix(vec3(0.6, 0.68, 0.86), vec3(0.93, 0.88, 0.8), clamp(nucleo * 1.5, 0.0, 1.0));
        gl_FragColor = vec4(col * (I * 0.012 + puntos * 0.09) * brillo + zod, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radio, 64, 32), mat);
}
