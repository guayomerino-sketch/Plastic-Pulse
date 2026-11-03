import { useEffect, useState } from 'react';
import { connectCloud } from './firebase';

/**
 * Community ideas for the Solution Lab.
 *
 *   ideas/{id}                    public ideas; a moderator (admins/{uid}) reviews them
 *   groups/{gid}/ideas/{id}       class ideas; the teacher reviews them, only classmates see them
 *   …/ideas/{id}/votes/{uid}      one vote per player, changed together with the idea's `votes`
 *
 * Every idea starts as 'pending'. Nobody else sees it until it is approved (young players).
 */
export type IdeaStatus = 'pending' | 'approved' | 'rejected';
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
  createdAt: number;
}
export interface IdeaForm { title: string; problem: string; idea: string; evidence: string }

const base = (groupId: string | null) => (groupId ? `groups/${groupId}/ideas` : 'ideas');

export async function pitchIdea(problemId: string, form: IdeaForm, groupId: string | null): Promise<void> {
  const { db, uid } = await connectCloud();
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  await addDoc(collection(db, base(groupId)), {
    problemId,
    title: form.title.trim(), problem: form.problem.trim(), idea: form.idea.trim(), evidence: form.evidence.trim(),
    uid, status: 'pending', votes: 0, createdAt: serverTimestamp(),
  });
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
            uid: x.uid, status: x.status, votes: x.votes ?? 0, createdAt: x.createdAt?.toMillis?.() ?? Date.now() };
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

export async function review(ideaPath: string, status: 'approved' | 'rejected'): Promise<void> {
  const { db } = await connectCloud();
  const { doc, updateDoc } = await import('firebase/firestore');
  await updateDoc(doc(db, ideaPath), { status });
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
