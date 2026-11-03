import { useEffect, useState } from 'react';
import { connectCloud } from './firebase';
import { SHARED_GOAL } from '../data/content';
import { getWhere } from './where';

/**
 * The weekly shared goal, live from Firestore.
 *
 *   goals/{week}                 { grams, targetGrams }   total refused or reused this week
 *   goals/{week}/players/{uid}   { grams }                one player's part (private to them)
 *
 * Both are increased together in one batch; firestore.rules checks that the two increases
 * match and that one choice adds at most MAX_GRAMS_PER_CHOICE. Grams come from the sourced
 * masses in specimens.ts, never from the AI.
 */
export const MAX_GRAMS_PER_CHOICE = 50; // keep in sync with firestore.rules
/** Anti-spam: one player can add at most this much to the shared goal per week (firestore.rules). */
export const MAX_GRAMS_PER_PLAYER_WEEK = 500;

/** ISO week id, e.g. "2026-W44". Weeks start on Monday (UTC). */
export function weekId(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // the Thursday of this week decides its year
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface GoalSnapshot {
  week: string;
  grams: number;
  targetGrams: number;
  mine: number; // this player's part this week
}

export type GoalStatus = { state: 'connecting' } | { state: 'offline' } | ({ state: 'live' } & GoalSnapshot);

/** Adds a refused or reused item to the world goal, and to the player's class or household if they're in one. */
export async function contribute(grams: number, groupId?: string | null): Promise<void> {
  if (!(grams > 0)) return;
  const g = Math.min(grams, MAX_GRAMS_PER_CHOICE);
  const { db, uid } = await connectCloud();
  const { doc, writeBatch, increment, serverTimestamp } = await import('firebase/firestore');
  const week = weekId();
  const where = await getWhere();
  const commit = (withGroup: boolean, withCity: boolean) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'goals', week), { grams: increment(g), targetGrams: SHARED_GOAL.targetGrams }, { merge: true });
    // `at` lets the rules enforce a short pause between choices.
    batch.set(doc(db, 'goals', week, 'players', uid), { grams: increment(g), at: serverTimestamp() }, { merge: true });
    if (withGroup && groupId) batch.set(doc(db, 'groups', groupId, 'weeks', week), { grams: increment(g) }, { merge: true });
    // The player's city light on the globe (rough city only, nothing personal).
    if (withCity && where) batch.set(doc(db, 'lights', week, 'cities', where.key), { grams: increment(g), name: where.city, country: where.country, lat: where.lat, lng: where.lng }, { merge: true });
    return batch.commit();
  };
  // If the class part is refused (left on another device, or removed), keep the city; if that fails too,
  // still count for the world.
  try { await commit(true, true); return; } catch (err) { if (!groupId && !where) throw err; }
  if (groupId && where) { try { await commit(false, true); return; } catch { /* fall through */ } }
  await commit(false, false);
}

export function useSharedGoal(): GoalStatus {
  const [status, setStatus] = useState<GoalStatus>({ state: 'connecting' });
  useEffect(() => {
    let stop: Array<() => void> = [];
    let cancelled = false;
    const week = weekId();
    let total = { grams: 0, targetGrams: SHARED_GOAL.targetGrams };
    let mine = 0;
    const publish = () => !cancelled && setStatus({ state: 'live', week, ...total, mine });
    (async () => {
      const { db, uid } = await connectCloud();
      const { doc, onSnapshot } = await import('firebase/firestore');
      if (cancelled) return;
      const fail = () => !cancelled && setStatus({ state: 'offline' });
      stop = [
        onSnapshot(doc(db, 'goals', week), (s) => {
          const d = s.data();
          total = { grams: d?.grams ?? 0, targetGrams: SHARED_GOAL.targetGrams }; // the current goal, even for a week begun under an older one
          publish();
        }, fail),
        onSnapshot(doc(db, 'goals', week, 'players', uid), (s) => { mine = s.data()?.grams ?? 0; publish(); }, fail),
      ];
    })().catch(() => !cancelled && setStatus({ state: 'offline' }));
    return () => { cancelled = true; stop.forEach((f) => f()); };
  }, []);
  return status;
}

export interface CityLight { key: string; name: string; country: string; lat: number; lng: number; grams: number }

/** This week's brightest city lights, live. */
export function useCityLights(max = 60): CityLight[] {
  const [lights, setLights] = useState<CityLight[]>([]);
  useEffect(() => {
    let stop = () => {};
    let alive = true;
    (async () => {
      const { db } = await connectCloud();
      const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
      if (!alive) return;
      stop = onSnapshot(query(collection(db, 'lights', weekId(), 'cities'), orderBy('grams', 'desc'), limit(max)),
        (snap) => setLights(snap.docs.map((d) => ({ key: d.id, ...(d.data() as Omit<CityLight, 'key'>) }))), () => {});
    })().catch(() => {});
    return () => { alive = false; stop(); };
  }, [max]);
  return lights;
}
