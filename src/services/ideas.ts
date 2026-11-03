import { useEffect, useState } from 'react';
import { connectCloud } from './firebase';

/**
 * Community ideas for the Solution Lab. Ideas appear right away: creativity never waits for approval.
 *
 *   ideas/{id}                    community ideas; the moderator (admins/{uid}) can hide or restore them
 *   groups/{gid}/ideas/{id}       class ideas; only classmates see them, the teacher can hide or restore them
 *   …/ideas/{id}/votes/{uid}      one vote per player, changed together with the idea's `votes`
 *   …/ideas/{id}/reports/{uid}    one report per player; the third report hides the idea until an adult looks
 *   pitchers/{uid}                when the player last pitched (one idea per minute)
 *
 * Keep the word list and limits in sync with firestore.rules.
 */
export type IdeaStatus = 'visible' | 'hidden';
export const HIDE_AFTER_REPORTS = 3;
const CONTACT = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}/, /[0-9][0-9 ()+.-]{6,}[0-9]/, /(https?:\/\/|www[.])/i];
const BAD_WORDS = /\b(fuck|shit|bitch|cunt|dick|pussy|asshole|bastard|slut|whore|nigg|fag|retard|puta|mierda|pendej|cabron|verga|chinga|coño|culero|marica)/i;
/** Why a text can't be shared, or null if it's fine. Shown kindly before sending. */
export function textProblem(t: string): string | null {
  if (CONTACT.some((re) => re.test(t))) return 'Please leave out emails, phone numbers and links, so everyone stays safe.';
  if (BAD_WORDS.test(t)) return 'Please keep the words friendly: some words here can’t be shared.';
  return null;
}
export interface CloudIdea {
  id: string;
  path: string; // Firestore path of the idea, e.g. "ideas/abc" or "groups/g1/ideas/abc"
  problemId: string;
  title: string;
  problem: string;
  idea: string;
  evidence: string;
  uid: string;
  status: IdeaStatus;
  votes: number;
  reports: number;
  createdAt: number;
}
export interface IdeaForm { title: string; problem: string; idea: string; evidence: string }

const base = (groupId: string | null) => (groupId ? `groups/${groupId}/ideas` : 'ideas');

export class TooSoon extends Error {}

/** Shares an idea right away with the class (if in one) or the community. */
export async function pitchIdea(problemId: string, form: IdeaForm, groupId: string | null): Promise<void> {
  const { db, uid } = await connectCloud();
  const { doc, collection, writeBatch, serverTimestamp, getDoc } = await import('firebase/firestore');
  const batch = writeBatch(db);
  batch.set(doc(collection(db, base(groupId))), {
    problemId,
    title: form.title.trim(), problem: form.problem.trim(), idea: form.idea.trim(), evidence: form.evidence.trim(),
    uid, status: 'visible', votes: 0, reports: 0, createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'pitchers', uid), { at: serverTimestamp() });
  try { await batch.commit(); } catch (err) {
    const last = (await getDoc(doc(db, 'pitchers', uid)).catch(() => null))?.data()?.at?.toMillis?.() ?? 0;
    if (Date.now() - last < 60_000) throw new TooSoon();
    throw err;
  }
}

type Filter = { field: 'status' | 'uid'; value: string };

/** Live list of ideas in one collection matching one filter, most-voted first. */
export function useIdeas(groupId: string | null, filter: Filter | null): CloudIdea[] | null {
  const [ideas, setIdeas] = useState<CloudIdea[] | null>(null);
  const key = `${groupId}|${filter?.field}|${filter?.value}`;
  useEffect(() => {
    if (!filter) { setIdeas(null); return; }
    let stop = () => {};
    let alive = true;
    (async () => {
      const { db, uid } = await connectCloud();
      const { collection, query, where, limit, onSnapshot } = await import('firebase/firestore');
      const value = filter.field === 'uid' && filter.value === 'me' ? uid : filter.value;
      const q = query(collection(db, base(groupId)), where(filter.field, '==', value), limit(100));
      if (!alive) return;
      stop = onSnapshot(q, (snap) => {
        setIdeas(snap.docs.map((d) => {
          const x = d.data();
          return { id: d.id, path: d.ref.path, problemId: x.problemId, title: x.title, problem: x.problem, idea: x.idea, evidence: x.evidence,
            uid: x.uid, status: x.status, votes: x.votes ?? 0, reports: x.reports ?? 0, createdAt: x.createdAt?.toMillis?.() ?? Date.now() };
        }).sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt));
      }, () => setIdeas([]));
    })().catch(() => setIdeas([]));
    return () => { alive = false; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ideas;
}

/** Add or remove this player's vote. The rules require the vote doc and the counter to change together. */
export async function setVote(ideaPath: string, on: boolean): Promise<void> {
  const { db, uid } = await connectCloud();
  const { doc, writeBatch, increment, serverTimestamp } = await import('firebase/firestore');
  const batch = writeBatch(db);
  const vote = doc(db, `${ideaPath}/votes/${uid}`);
  if (on) batch.set(vote, { at: serverTimestamp() }); else batch.delete(vote);
  batch.update(doc(db, ideaPath), { votes: increment(on ? 1 : -1) });
  await batch.commit();
}

/** Whether this player has voted for an idea (checked on the server, so it works across devices). */
export async function hasVoted(ideaPath: string): Promise<boolean> {
  const { db, uid } = await connectCloud();
  const { doc, getDoc } = await import('firebase/firestore');
  return (await getDoc(doc(db, `${ideaPath}/votes/${uid}`))).exists();
}

/** A player flags an idea. The third report hides it until a teacher or the moderator looks. */
export async function reportIdea(idea: CloudIdea): Promise<void> {
  const { db, uid } = await connectCloud();
  const { doc, writeBatch, increment, serverTimestamp } = await import('firebase/firestore');
  const batch = writeBatch(db);
  batch.set(doc(db, `${idea.path}/reports/${uid}`), { at: serverTimestamp() });
  batch.update(doc(db, idea.path), { reports: increment(1), status: idea.reports + 1 >= HIDE_AFTER_REPORTS ? 'hidden' : 'visible' });
  await batch.commit();
}

/** A teacher (class ideas) or the moderator (community ideas) hides or restores an idea. */
export async function setHidden(ideaPath: string, hidden: boolean): Promise<void> {
  const { db } = await connectCloud();
  const { doc, updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, ideaPath), hidden ? { status: 'hidden' } : { status: 'visible', reports: 0 });
}

export async function deleteIdea(ideaPath: string): Promise<void> {
  const { db } = await connectCloud();
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, ideaPath));
}

/** Moderators are listed in admins/{uid}, added by hand in the Firebase console. */
export function useIsModerator(googleUid: string | null): boolean {
  const [mod, setMod] = useState(false);
  useEffect(() => {
    if (!googleUid) { setMod(false); return; }
    let alive = true;
    (async () => {
      const { db } = await connectCloud();
      const { doc, getDoc } = await import('firebase/firestore');
      const s = await getDoc(doc(db, 'admins', googleUid));
      if (alive) setMod(s.exists());
    })().catch(() => alive && setMod(false));
    return () => { alive = false; };
  }, [googleUid]);
  return mod;
}
