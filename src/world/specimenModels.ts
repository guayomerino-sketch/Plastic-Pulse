import * as THREE from 'three';
import type { ShapeId } from '../types';

/**
 * Procedural 3D models for specimen holograms. Built in code (no model files), each about 2 units tall,
 * so the Specimen Book stays light enough for budget phones.
 */
const V = (x: number, y: number) => new THREE.Vector2(x, y);

function lathe(profile: THREE.Vector2[], segments = 40) {
  return new THREE.LatheGeometry(profile, segments);
}

function cupProfile(rBottom: number, rTop: number, h: number) {
  return [V(0, -h / 2), V(rBottom, -h / 2), V(rTop, h / 2), V(rTop - 0.03, h / 2 - 0.02)];
}

function bulgeBox(w: number, h: number, d: number, pinch: number) {
  // A pillow: full depth in the middle, pinched flat at the top and bottom seams.
  const g = new THREE.BoxGeometry(w, h, d, 10, 14, 4);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / (h / 2);
    const x = p.getX(i) / (w / 2);
    const k = Math.max(pinch, Math.cos((y * Math.PI) / 2)) * (0.75 + 0.25 * Math.cos((x * Math.PI) / 2));
    p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

function wavyPlane(w: number, h: number, amp: number) {
  const g = new THREE.PlaneGeometry(w, h, 18, 18);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, Math.sin(x * 2.4) * amp + Math.cos(y * 2.1) * amp * 0.6);
  }
  g.computeVertexNormals();
  return g;
}

/** Meshes for one specimen, centred on the origin. */
export function buildSpecimen(shape: ShapeId): THREE.BufferGeometry[] {
  switch (shape) {
    case 'bottle':
      return [lathe([V(0, -1.05), V(0.42, -1.05), V(0.46, -0.95), V(0.46, 0.25), V(0.36, 0.55), V(0.16, 0.8), V(0.15, 0.95), V(0.18, 0.97), V(0.18, 1.05), V(0, 1.05)])];
    case 'cap': {
      const g = new THREE.CylinderGeometry(0.8, 0.8, 0.55, 36, 1, false);
      return [g, new THREE.CylinderGeometry(0.64, 0.64, 0.05, 24).translate(0, 0.3, 0)];
    }
    case 'bag': {
      const body = bulgeBox(1.3, 1.5, 0.45, 0.2).translate(0, -0.2, 0);
      const h1 = new THREE.TorusGeometry(0.28, 0.035, 8, 24, Math.PI).translate(-0.32, 0.55, 0);
      const h2 = new THREE.TorusGeometry(0.28, 0.035, 8, 24, Math.PI).translate(0.32, 0.55, 0);
      return [body, h1, h2];
    }
    case 'straw': {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1.1, 0), new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0.12, 0.7, 0), new THREE.Vector3(0.45, 0.95, 0)]);
      return [new THREE.TubeGeometry(curve, 48, 0.07, 10, false)];
    }
    case 'foam-cup':
      return [lathe(cupProfile(0.42, 0.66, 1.5)), new THREE.TorusGeometry(0.67, 0.035, 8, 40).rotateX(Math.PI / 2).translate(0, 0.75, 0)];
    case 'rings': {
      const out: THREE.BufferGeometry[] = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) out.push(new THREE.TorusGeometry(0.3, 0.05, 8, 28).scale(1, 1.25, 1).translate((c - 1) * 0.68, (r - 0.5) * 0.82, 0));
      return out;
    }
    case 'net': {
      // Square mesh of knotted line, drifting in the current. Marked as lines for the hologram.
      const pts: number[] = [], n = 11, size = 2.2;
      const at = (i: number, j: number) => { const x = (i / (n - 1) - 0.5) * size, y = (j / (n - 1) - 0.5) * size; return [x, y, Math.sin(x * 1.8) * 0.25 + Math.cos(y * 1.5) * 0.2]; };
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (i < n - 1) pts.push(...at(i, j), ...at(i + 1, j));
        if (j < n - 1) pts.push(...at(i, j), ...at(i, j + 1));
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.userData.lines = true;
      return [g];
    }
    case 'coffee-cup':
      return [
        lathe(cupProfile(0.4, 0.58, 1.5)).translate(0, -0.1, 0),
        lathe([V(0, 0.75), V(0.62, 0.68), V(0.62, 0.74), V(0.5, 0.82), V(0, 0.86)]),
        new THREE.CylinderGeometry(0.56, 0.47, 0.5, 32, 1, true).translate(0, -0.15, 0),
      ];
    case 'chip-bag':
      return [bulgeBox(1.35, 1.7, 0.55, 0.05), new THREE.BoxGeometry(1.38, 0.14, 0.05, 12, 1, 1).translate(0, 0.92, 0), new THREE.BoxGeometry(1.38, 0.14, 0.05, 12, 1, 1).translate(0, -0.92, 0)];
    case 'toothbrush': {
      const out: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.16, 1.7, 0.1).translate(0, -0.3, 0), new THREE.BoxGeometry(0.2, 0.45, 0.1).translate(0, 0.78, 0)];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) out.push(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6).rotateX(Math.PI / 2).translate((j - 0.5) * 0.09, 0.62 + i * 0.1, 0.16));
      return out;
    }
    case 'wipe':
      return [wavyPlane(1.7, 1.7, 0.12)];
    case 'tea-bag': {
      const bag = new THREE.TetrahedronGeometry(0.85).rotateX(-0.6).translate(0, -0.2, 0);
      const tag = new THREE.BoxGeometry(0.35, 0.25, 0.02).translate(0.45, 1.0, 0);
      const string = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0.1, 0.9, 0), new THREE.Vector3(0.45, 0.9, 0)), 16, 0.012, 4, false);
      return [bag, tag, string];
    }
    case 'shirt': {
      const s = new THREE.Shape();
      s.moveTo(-0.55, -0.95); s.lineTo(0.55, -0.95); s.lineTo(0.55, 0.35); s.lineTo(0.95, 0.15); s.lineTo(1.1, 0.5); s.lineTo(0.6, 0.85);
      s.quadraticCurveTo(0, 0.6, -0.6, 0.85); s.lineTo(-1.1, 0.5); s.lineTo(-0.95, 0.15); s.lineTo(-0.55, 0.35); s.lineTo(-0.55, -0.95);
      return [new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }).translate(0, 0, -0.09)];
    }
    case 'glitter': {
      const out: THREE.BufferGeometry[] = [];
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 46; i++) {
        const r = 0.35 + rnd() * 0.75, a = rnd() * Math.PI * 2, b = Math.acos(rnd() * 2 - 1);
        out.push(new THREE.CircleGeometry(0.07 + rnd() * 0.05, 6).rotateX(rnd() * 3).rotateY(rnd() * 3)
          .translate(r * Math.sin(b) * Math.cos(a), r * Math.cos(b) * 1.1, r * Math.sin(b) * Math.sin(a)));
      }
      return out;
    }
    case 'gum':
      return [new THREE.CapsuleGeometry(0.38, 0.9, 8, 20).rotateZ(Math.PI / 2).scale(1, 0.6, 1), new THREE.CapsuleGeometry(0.3, 0.6, 6, 16).rotateZ(Math.PI / 2).scale(1, 0.55, 1).translate(0.2, 0.42, 0.15)];
  }
}
