import { SPECIMENS } from '../data/specimens';
import { connectCloud } from './firebase';
import { isMaterialId, type MaterialId } from '../data/materials';

/**
 * AI photo scanner. The photo goes to our own server function (api/scan.ts), which holds the
 * Gemini key: the key never ships inside the app. Gemini names any item and guesses its plastic
 * family; facts come from our sourced specimens and materials tables, never from the AI.
 * Photos are downscaled first and never stored.
 */
export interface ScanResult {
  specimenId: string | null; // one of our sourced specimens, or null
  label: string;
  confidence: number;
  plastic: 'yes' | 'partly' | 'no' | 'unsure';
  material: MaterialId;
  parts: string;
}

export class ScannerNotConfigured extends Error {}
/** The free daily allowance is used up, or this player scanned a lot this hour. */
export class ScannerBusy extends Error {}

export async function identifyPlastic(file: File): Promise<ScanResult> {
  const image = await downscale(file, 768);
  const { auth } = await connectCloud();
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ image }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 503) throw new ScannerNotConfigured('AI scanner not connected yet');
  if (res.status === 429) throw new ScannerBusy('scanner busy');
  if (!res.ok) throw new Error(`Scanner error ${res.status}`);
  const data = (await res.json()) as Partial<ScanResult>;
  const known = SPECIMENS.some((s) => s.id === data.specimenId);
  return {
    specimenId: known ? data.specimenId! : null,
    label: data.label || 'Unknown item',
    confidence: data.confidence ?? 0,
    plastic: data.plastic ?? 'unsure',
    material: isMaterialId(data.material) ? data.material : 'UNKNOWN',
    parts: data.parts ?? '',
  };
}

/** Shrinks a photo before upload: faster on mobile data and cheaper to analyze. */
async function downscale(file: File, max: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const slugify = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'item';

/**
 * Anonymous tally of what players scan that isn't in the Specimen Book yet: only the label and material,
 * never the photo or the player. It tells us which items to source next.
 */
export async function tallyUnmatched(label: string, material: MaterialId): Promise<void> {
  const { db } = await connectCloud();
  const { doc, setDoc, increment } = await import('firebase/firestore');
  await setDoc(doc(db, 'scanTally', slugify(label)), { label: label.slice(0, 60), material, count: increment(1) }, { merge: true });
}
