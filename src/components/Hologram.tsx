import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Rarity, ShapeId } from '../types';
import { buildSpecimen } from '../world/specimenModels';
import { isWebGLAvailable } from '../world/World3D';

const TINT: Record<Rarity, number> = { Common: 0x3ee6c8, Hidden: 0xb9a4ff, Rare: 0xffc566 };

/**
 * A spinning 3D hologram of one specimen, projected from a glowing base with a scanner beam.
 * Drag to turn it. Reduced motion: it stays still until dragged.
 */
export default function Hologram({ shape, rarity, label }: { shape: ShapeId; rarity: Rarity; label: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !isWebGLAvailable()) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const tint = new THREE.Color(TINT[rarity]);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.55, 5.2);
    camera.lookAt(0, 0, 0);

    // Hologram skin: bright rim, see-through middle, scanlines that drift upward.
    const skin = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: tint }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vec4 w = modelMatrix*vec4(position,1.); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); vY = w.y;
          gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float rim = pow(1. - abs(dot(normalize(vN), vV)), 2.2);
          float lines = .55 + .45*step(.5, fract(vY*22. - uTime*1.5));
          float a = (.12 + rim*.9)*lines;
          gl_FragColor = vec4(uColor*(.6 + rim*1.2), a); }`,
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: tint, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

    const model = new THREE.Group();
    const geos = buildSpecimen(shape);
    for (const g of geos) {
      if (g.userData.lines) { model.add(new THREE.LineSegments(g, edgeMat)); continue; }
      model.add(new THREE.Mesh(g, skin));
      model.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), edgeMat));
    }
    model.rotation.x = 0.12;
    scene.add(model);

    // Projector base and scanner beam.
    const base = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.05, 48), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    base.rotation.x = -Math.PI / 2; base.position.y = -1.3; scene.add(base);
    const beam = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.08, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.rotation.x = -Math.PI / 2; scene.add(beam);

    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(el);

    // Drag to spin; it keeps a little momentum.
    let spin = reduceMotion ? 0 : 0.5, drag: number | null = null, lastX = 0;
    const down = (e: PointerEvent) => { drag = e.pointerId; lastX = e.clientX; el.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (drag !== e.pointerId) return; const dx = e.clientX - lastX; lastX = e.clientX; model.rotation.y += dx * 0.012; spin = dx * 0.6; draw(); };
    const up = (e: PointerEvent) => { if (drag === e.pointerId) drag = null; };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

    const clock = new THREE.Clock();
    let raf = 0, visible = true;
    const draw = () => renderer.render(scene, camera);
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
      if (drag === null) { model.rotation.y += spin * dt; spin += ((reduceMotion ? 0 : 0.5) - spin) * Math.min(1, dt * 1.5); }
      if (!reduceMotion) { model.position.y = Math.sin(t * 1.4) * 0.05; beam.position.y = -1.25 + ((t * 0.6) % 1) * 2.6; (beam.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.sin(((t * 0.6) % 1) * Math.PI); }
      skin.uniforms.uTime.value = t;
      draw();
    };
    // Pause when scrolled off screen to save battery.
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(el);
    if (reduceMotion) { beam.visible = false; draw(); } else tick();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); });
      skin.dispose(); edgeMat.dispose(); (base.material as THREE.Material).dispose(); (beam.material as THREE.Material).dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [shape, rarity]);

  return <div ref={host} className={`hologram r-${rarity.toLowerCase()}`} role="img" aria-label={`3D hologram of ${label}. Drag to turn it.`} />;
}
