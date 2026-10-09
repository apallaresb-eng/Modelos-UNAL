// Post-procesado cinematográfico ligado a la calidad adaptativa.
//   baja:  SMAA + tone mapping
//   media: + bloom + viñeta
//   alta:  + oclusión ambiental (N8AO) + profundidad de campo (opcional)
// Uso: const post = crearPostproceso(renderer, escena, camara, { bloom: { intensity: 0.6 } });
//      calidad.alCambiar((n) => post.aplicarNivel(n)); … en el bucle: post.render(dt)
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, SMAAEffect, BloomEffect, VignetteEffect,
  ToneMappingEffect, ToneMappingMode, DepthOfFieldEffect, Effect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

export function crearPostproceso(renderer, escena, camara, opciones = {}) {
  const {
    tonemapping = ToneMappingMode.AGX,
    bloom = { intensity: 0.55, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, mipmapBlur: true },
    vineta = { offset: 0.32, darkness: 0.55 },
    ao = { aoRadius: 2, distanceFalloff: 1, intensity: 2.2 },
    gradacion = null, // firma de color: { sombras: [r,g,b], luces: [r,g,b], grano: 0.006 }, en espacio lineal (después del tone mapping)
    profundidad = null, // p. ej. { focusDistance: 60, focusRange: 40, bokehScale: 2 } en unidades de mundo
  } = opciones;

  // El tone mapping lo hace el post-procesado, no el renderer.
  renderer.toneMapping = THREE.NoToneMapping;
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  const efectos = {
    smaa: new SMAAEffect(),
    tono: new ToneMappingEffect({ mode: tonemapping }),
    bloom: bloom ? new BloomEffect(bloom) : null,
    vineta: vineta ? new VignetteEffect(vineta) : null,
    gradacion: gradacion ? crearGradacion(gradacion) : null,
    dof: profundidad ? new DepthOfFieldEffect(camara, { ...profundidad, worldFocusDistance: profundidad.focusDistance, worldFocusRange: profundidad.focusRange }) : null,
  };
  const pasoRender = new RenderPass(escena, camara);
  const pasoAO = ao ? new N8AOPostPass(escena, camara, 1, 1) : null;
  if (pasoAO) Object.assign(pasoAO.configuration, { ...ao, gammaCorrection: false, halfRes: true });
  let pasoEfectos = null;
  let nivelActual = null;

  function montar(nivel) {
    composer.removeAllPasses();
    if (pasoEfectos) pasoEfectos.dispose();
    composer.addPass(pasoRender);
    if (pasoAO && nivel.nombre === 'alta') composer.addPass(pasoAO);
    const lista = [];
    if (efectos.dof && nivel.nombre === 'alta') lista.push(efectos.dof);
    if (efectos.bloom && nivel.nombre !== 'baja') lista.push(efectos.bloom);
    if (efectos.vineta && nivel.nombre !== 'baja') lista.push(efectos.vineta);
    lista.push(efectos.tono);
    if (efectos.gradacion && nivel.nombre !== 'baja') lista.push(efectos.gradacion);
    lista.push(efectos.smaa);
    pasoEfectos = new EffectPass(camara, ...lista);
    composer.addPass(pasoEfectos);
  }

  return {
    composer,
    efectos,
    aplicarNivel(nivel) {
      if (nivelActual === nivel.nombre) return;
      nivelActual = nivel.nombre;
      montar(nivel);
    },
    setSize(ancho, alto) { composer.setSize(ancho, alto, false); },
    render(dt) { composer.render(dt); },
  };
}

// Gradación tipo "split toning": tiñe las sombras y las luces por separado y agrega grano fino de película.
function crearGradacion({ sombras = [0.0, 0.0006, 0.002], luces = [1.03, 1.0, 0.95], grano = 0.005 } = {}) { // valores en espacio LINEAL
  return new Effect('Gradacion', /* glsl */`
    uniform vec3 sombras; uniform vec3 luces; uniform float grano;
    float azar(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void mainImage(const in vec4 entrada, const in vec2 uv, out vec4 salida) {
      vec3 c = entrada.rgb;
      float y = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c += sombras * (1.0 - smoothstep(0.0, 0.05, y));
      c *= mix(vec3(1.0), luces, smoothstep(0.1, 0.8, y));
      c += (azar(uv * 1024.0 + fract(time) * 37.0) - 0.5) * grano * (0.3 + 0.7 * smoothstep(0.0, 0.2, y));
      salida = vec4(c, entrada.a);
    }`, { uniforms: new Map([['sombras', { value: new THREE.Vector3(...sombras) }], ['luces', { value: new THREE.Vector3(...luces) }], ['grano', { value: grano }]]) });
}
