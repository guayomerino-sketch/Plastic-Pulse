/**
 * The player's rough city (from /api/where), used to light their city on the globe.
 * Asked once per visit. Never GPS; nothing about the player is stored with it.
 */
export interface Where { city: string; country: string; lat: number; lng: number; key: string }

let cached: Promise<Where | null> | null = null;

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export function getWhere(): Promise<Where | null> {
  cached ??= fetch('/api/where', { signal: AbortSignal.timeout(8000) })
    .then((r) => (r.ok ? r.json() : {}))
    .then((w: Partial<Where>) => {
      if (!w.city || !w.country || typeof w.lat !== 'number' || typeof w.lng !== 'number') return null;
      const s = slug(w.city);
      return s ? { city: w.city, country: w.country, lat: w.lat, lng: w.lng, key: `${w.country}-${s}` } : null;
    })
    .catch(() => null);
  cached.then((w) => { if (!w) cached = null; }); // a failed lookup is tried again next time
  return cached;
}
