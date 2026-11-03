import { SPECIMENS } from '../data/specimens';
import { connectCloud } from './firebase';

/**
 * AI photo scanner. The photo goes to our own server function (api/scan.ts), which holds the
 * Gemini key: the key never ships inside the app. Gemini only picks which of our sourced
 * specimens is in the photo, so the AI never invents facts or impact numbers.
 * Photos are downscaled first and never stored.
 */
export interface ScanResult {
  specimenId: string | null;
  label: string;
  confidence: number;
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
  const data = (await res.json()) as ScanResult;
  const known = SPECIMENS.some((s) => s.id === data.specimenId);
  return { ...data, specimenId: known ? data.specimenId : null };
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
