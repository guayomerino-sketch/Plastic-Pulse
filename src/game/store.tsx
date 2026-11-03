import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ChoiceAction, FieldFind, GameState, GroupRef, Idea, LabProgress } from '../types';
import { CHALLENGES, RANKS, XP } from '../data/content';
import { DISCOVERY_XP, specimenById } from '../data/specimens';

// Phase 1: progress is saved on this device. Phase 2 moves it to Firebase.
const STORAGE_KEY = 'plastic-pulse:v1';

const today = () => new Date().toISOString().slice(0, 10);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const initialState: GameState = {
  version: 1,
  xp: 0,
  health: 0.62,
  streakDays: 0,
  lastActiveDay: null,
  logs: [],
  lab: {},
  activeChallengeId: CHALLENGES[0].id,
  ideas: [],
  votedIdeaIds: [],
  musicOn: true,
  studied: [],
  discovery: null,
  group: null,
  finds: [],
};

export type Action =
  | { type: 'log'; specimenId: string; action: ChoiceAction }
  | { type: 'lab/hypothesis'; id: string; text: string }
  | { type: 'lab/toggleDay'; id: string; day: number }
  | { type: 'lab/conclude'; id: string; text: string }
  | { type: 'lab/select'; id: string }
  | { type: 'idea/add'; idea: Omit<Idea, 'id' | 'createdAt' | 'mine' | 'votes'> }
  | { type: 'idea/vote'; id: string }
  | { type: 'music'; on: boolean }
  | { type: 'study'; specimenId: string }
  | { type: 'discovery/clear' }
  | { type: 'merge'; cloud: GameState }
  | { type: 'group'; group: GroupRef | null }
  | { type: 'find/add'; find: Omit<FieldFind, 'firstAt' | 'refused' | 'reused' | 'used'> }
  | { type: 'find/log'; slug: string; action: ChoiceAction }
  | { type: 'reset' };

function touchStreak(s: GameState): GameState {
  const d = today();
  if (s.lastActiveDay === d) return s;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return { ...s, lastActiveDay: d, streakDays: s.lastActiveDay === yesterday ? s.streakDays + 1 : 1 };
}

function emptyLab(id: string): LabProgress {
  const ch = CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0];
  return { hypothesis: '', done: Array(ch.days).fill(false), conclusion: '', completed: false };
}

export const isFound = (s: GameState, id: string) => s.studied.includes(id) || s.logs.some((l) => l.specimenId === id);

/** The first time a player meets a specimen: bonus XP by rarity and a reveal. */
function discover(s: GameState, id: string): GameState {
  if (isFound(s, id)) return s;
  return { ...s, xp: s.xp + DISCOVERY_XP[specimenById(id).rarity], discovery: { specimenId: id, at: Date.now() } };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'log': {
      const delta = a.action === 'refuse' ? 0.06 : a.action === 'reuse' ? 0.03 : -0.06;
      const next = touchStreak(discover(s, a.specimenId));
      return {
        ...next,
        xp: next.xp + XP[a.action],
        health: clamp(next.health + delta, 0.05, 1),
        logs: [...next.logs, { specimenId: a.specimenId, action: a.action, at: Date.now() }].slice(-2000),
      };
    }
    case 'lab/select':
      return { ...s, activeChallengeId: a.id };
    case 'lab/hypothesis': {
      const p = s.lab[a.id] ?? emptyLab(a.id);
      return { ...s, lab: { ...s.lab, [a.id]: { ...p, hypothesis: a.text } } };
    }
    case 'lab/toggleDay': {
      const p = s.lab[a.id] ?? emptyLab(a.id);
      const done = p.done.slice();
      const turningOn = !done[a.day];
      done[a.day] = turningOn;
      return { ...touchStreak(s), xp: s.xp + (turningOn ? XP.labDay : -XP.labDay), lab: { ...s.lab, [a.id]: { ...p, done } } };
    }
    case 'lab/conclude': {
      const p = s.lab[a.id] ?? emptyLab(a.id);
      if (p.completed || !p.done.every(Boolean) || a.text.trim().length < 10) return s;
      const ch = CHALLENGES.find((c) => c.id === a.id)!;
      return { ...s, xp: s.xp + ch.xp, lab: { ...s.lab, [a.id]: { ...p, conclusion: a.text.trim(), completed: true } } };
    }
    case 'idea/add': {
      const idea: Idea = { ...a.idea, id: `mine-${Date.now()}`, createdAt: Date.now(), mine: true, votes: 0 };
      return { ...touchStreak(s), xp: s.xp + XP.idea, ideas: [idea, ...s.ideas] };
    }
    case 'idea/vote': {
      const voted = s.votedIdeaIds.includes(a.id);
      return { ...s, votedIdeaIds: voted ? s.votedIdeaIds.filter((i) => i !== a.id) : [...s.votedIdeaIds, a.id] };
    }
    case 'music':
      return { ...s, musicOn: a.on };
    case 'study': {
      if (s.studied.includes(a.specimenId)) return s;
      const next = discover(s, a.specimenId);
      return { ...next, studied: [...next.studied, a.specimenId] };
    }
    case 'discovery/clear':
      return { ...s, discovery: null };
    case 'group':
      return { ...s, group: a.group };
    case 'find/add': {
      // A new kind of thing identified: +XP the first time. Later scans of the same thing just refresh it.
      if (s.finds.some((f) => f.slug === a.find.slug)) return s;
      return { ...touchStreak(s), xp: s.xp + XP.find, finds: [{ ...a.find, firstAt: Date.now(), refused: 0, reused: 0, used: 0 }, ...s.finds].slice(0, 500) };
    }
    case 'find/log': {
      const delta = a.action === 'refuse' ? 0.06 : a.action === 'reuse' ? 0.03 : -0.06;
      const key = a.action === 'refuse' ? 'refused' : a.action === 'reuse' ? 'reused' : 'used';
      const next = touchStreak(s);
      return { ...next, xp: next.xp + XP[a.action], health: clamp(next.health + delta, 0.05, 1),
        finds: next.finds.map((f) => (f.slug === a.slug ? { ...f, [key]: f[key] + 1 } : f)) };
    }
    case 'merge':
      return mergeStates(s, a.cloud);
    case 'reset':
      return initialState;
  }
}

/**
 * Combine this device's progress with progress saved in the player's account, so signing in
 * on a second device never loses anything. Collections are joined; totals take the larger value.
 */
export function mergeStates(local: GameState, cloud: GameState): GameState {
  const c = { ...initialState, ...cloud };
  const key = (l: GameState['logs'][number]) => `${l.at}|${l.specimenId}|${l.action}`;
  const logs = [...new Map([...c.logs, ...local.logs].map((l) => [key(l), l])).values()].sort((a, b) => a.at - b.at).slice(-2000);
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  const lab: GameState['lab'] = { ...c.lab };
  for (const [id, p] of Object.entries(local.lab)) {
    const q = lab[id];
    const score = (x: typeof p) => (x.completed ? 1000 : 0) + x.done.filter(Boolean).length;
    if (!q || score(p) > score(q)) lab[id] = p;
  }
  const ideas = [...new Map([...c.ideas, ...local.ideas].map((i) => [i.id, i])).values()];
  const ahead = local.xp >= c.xp ? local : c, behind = ahead === local ? c : local;
  // XP the other side earned that the leading side never saw: its own choices and its first discoveries.
  const aheadKeys = new Set(ahead.logs.map(key));
  const found = (st: GameState) => new Set([...st.logs.map((l) => l.specimenId), ...st.studied]);
  const aheadFound = found(ahead);
  const extraXp = behind.logs.filter((l) => !aheadKeys.has(key(l))).reduce((n, l) => n + XP[l.action], 0)
    + [...found(behind)].filter((id) => !aheadFound.has(id)).reduce((n, id) => n + DISCOVERY_XP[specimenById(id).rarity], 0);
  const lastDay = [local.lastActiveDay, c.lastActiveDay].filter(Boolean).sort().pop() ?? null;
  return {
    ...ahead,
    version: 1,
    xp: ahead.xp + extraXp,
    streakDays: Math.max(local.streakDays, c.streakDays),
    lastActiveDay: lastDay,
    logs, lab, ideas,
    studied: union(c.studied, local.studied),
    votedIdeaIds: union(c.votedIdeaIds, local.votedIdeaIds),
    musicOn: local.musicOn,
    discovery: null,
    group: local.group ?? c.group ?? null,
    finds: [...new Map([...(c.finds ?? []), ...(local.finds ?? [])].map((f) => [f.slug, f])).values()],
  };
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as GameState;
    return parsed.version === 1 ? { ...initialState, ...parsed, discovery: null } : initialState;
  } catch {
    return initialState;
  }
}

/* ---------- derived values ---------- */
export function rankFor(s: GameState) {
  const labsDone = Object.values(s.lab).filter((l) => l.completed).length;
  const ideasMine = s.ideas.filter((i) => i.mine).length;
  let current = RANKS[0];
  for (const r of RANKS) {
    if (s.xp < r.minXp) break;
    if (r.requirement === 'lab' && labsDone < 1) break;
    if (r.requirement === 'idea' && ideasMine < 1) break;
    current = r;
  }
  const idx = RANKS.indexOf(current);
  const next = RANKS[idx + 1] ?? null;
  return { current, next, index: idx, labsDone, ideasMine };
}

export function impactFor(s: GameState) {
  let gramsAvoided = 0, refused = 0, reused = 0, used = 0;
  for (const l of s.logs) {
    const g = specimenById(l.specimenId).massGrams ?? 0;
    if (l.action === 'refuse') { refused++; gramsAvoided += g; }
    else if (l.action === 'reuse') { reused++; gramsAvoided += g; }
    else used++;
  }
  return { gramsAvoided: Math.round(gramsAvoided), refused, reused, used };
}

export const healthLabel = (h: number) => (h > 0.75 ? 'Thriving' : h > 0.5 ? 'Stable' : h > 0.3 ? 'Stressed' : 'Critical');

/* ---------- context ---------- */
const Ctx = createContext<{ state: GameState; dispatch: React.Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside <GameProvider>');
  return v;
}
