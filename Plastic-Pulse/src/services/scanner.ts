import { SPECIMENS } from '../data/specimens';

/**
 * AI photo scanner.
 *
 * SECURITY: the Gemini API key must never ship inside the app. Phase 2 adds a small server
 * (a Firebase Cloud Function) that holds the key and calls Gemini. The app only knows the
 * function's URL, set as VITE_SCAN_ENDPOINT in .env.local.
 *
 * The server receives { image: <base64 JPEG>, specimens: [{id,name}] } and must answer
 * { specimenId: string | null, label: string, confidence: number }. It picks from our own
 * sourced specimen list, so the AI never invents impact numbers.
 */
export interface ScanResult {
  specimenId: string | null;
  label: string;
  confidence: number;
}

export class ScannerNotConfigured extends Error {}

export const scannerEndpoint = (import.meta as any).env?.VITE_SCAN_ENDPOINT as string | undefined;

export async function identifyPlastic(file: File): Promise<ScanResult> {
  if (!scannerEndpoint) throw new ScannerNotConfigured('AI scanner not connected yet');
  const image = await downscale(file, 768);
  const res = await fetch(scannerEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, specimens: SPECIMENS.map((s) => ({ id: s.id, name: s.name })) }),
  });
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
