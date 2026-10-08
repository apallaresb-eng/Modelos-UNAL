// Post-procesado cinematográfico ligado a la calidad adaptativa.
//   baja:  SMAA + tone mapping
//   media: + bloom + viñeta
//   alta:  + oclusión ambiental (N8AO) + profundidad de campo (opcional)
// Uso: const post = crearPostproceso(renderer, escena, camara, { bloom: { intensity: 0.6 } });
//      calidad.alCambiar((n) => post.aplicarNivel(n)); … en el bucle: post.render(dt)
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, SMAAEffect, BloomEffect, VignetteEffect,
  ToneMappingEffect, ToneMappingMode, DepthOfFieldEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

export function crearPostproceso(renderer, escena, camara, opciones = {}) {
  const {
    tonemapping = ToneMappingMode.AGX,
    bloom = { intensity: 0.55, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, mipmapBlur: true },
    vineta = { offset: 0.32, darkness: 0.55 },
    ao = { aoRadius: 2, distanceFalloff: 1, intensity: 2.2 },
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
    lista.push(efectos.tono, efectos.smaa);
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
