import { useEffect, useState } from 'react';
import type { Vitals } from './types';

export type VitalsStatus = { state: 'loading' } | { state: 'error' } | { state: 'ok'; vitals: Vitals };

let cached: Promise<Vitals> | null = null;

/** Earth's vital signs from /api/vitals, fetched once per visit. */
export function useVitals(): VitalsStatus {
  const [status, setStatus] = useState<VitalsStatus>({ state: 'loading' });
  useEffect(() => {
    let alive = true;
    cached ??= fetch('/api/vitals', { signal: AbortSignal.timeout(30_000) }).then((r) => {
      if (!r.ok) throw new Error(`vitals: HTTP ${r.status}`);
      return r.json() as Promise<Vitals>;
    });
    cached.then((vitals) => alive && setStatus({ state: 'ok', vitals })).catch(() => { cached = null; if (alive) setStatus({ state: 'error' }); });
    return () => { alive = false; };
  }, []);
  return status;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-11-01" → "1 Nov 2026" (no time zone shifts). */
export const dateLabel = (d: string) => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MONTHS[m - 1]} ${y}`; };
