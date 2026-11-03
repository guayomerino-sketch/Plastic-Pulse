import { useEffect, useState } from 'react';
import type { GroupKind, GroupRef } from '../types';
import { connectCloud } from './firebase';
import { weekId } from './sharedGoal';

/**
 * Groups: a class made by a teacher, or (later) a household. Members join with a short code.
 *
 *   groups/{gid}                 { name, kind, code, ownerUid, targetGrams, createdAt }
 *   codes/{code}                 { groupId }        looks a group up by its code
 *   groups/{gid}/members/{uid}   { joinedAt }       anonymous: the owner sees how many, not who
 *   groups/{gid}/weeks/{week}    { grams }          grows with each member's capped part of the world goal
 *
 * Keep the alphabet and goals in sync with firestore.rules.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0 or I/1, so codes are easy to read aloud
export const GROUP_TARGET: Record<GroupKind, number> = { class: 3000, household: 1000 };
export const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
export const validCode = (c: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(c);
export const joinLink = (code: string) => `${location.origin}/?class=${code}`;

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** A teacher (signed in with Google) makes a class. Retries if the random code is already taken. */
export async function createGroup(name: string, kind: GroupKind = 'class'): Promise<GroupRef> {
  const { db, uid } = await connectCloud();
  const { doc, collection, writeBatch, serverTimestamp } = await import('firebase/firestore');
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const ref = doc(collection(db, 'groups'));
    const batch = writeBatch(db);
    batch.set(ref, { name: name.trim(), kind, code, ownerUid: uid, targetGrams: GROUP_TARGET[kind], createdAt: serverTimestamp() });
    batch.set(doc(db, 'codes', code), { groupId: ref.id });
    try { await batch.commit(); return { id: ref.id, name: name.trim(), code, kind }; } catch (err) {
      if (attempt === 4) throw err; // a taken code fails the batch; try another
    }
  }
  throw new Error('unreachable');
}

export class CodeNotFound extends Error {}

/** A student joins with a code. No account or name needed. */
export async function joinGroup(rawCode: string): Promise<GroupRef> {
  const code = normalizeCode(rawCode);
  if (!validCode(code)) throw new CodeNotFound(code);
  const { db, uid } = await connectCloud();
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const c = await getDoc(doc(db, 'codes', code));
  if (!c.exists()) throw new CodeNotFound(code);
  const gid = c.data().groupId as string;
  const g = await getDoc(doc(db, 'groups', gid));
  if (!g.exists()) throw new CodeNotFound(code);
  await setDoc(doc(db, 'groups', gid, 'members', uid), { joinedAt: serverTimestamp() });
  return { id: gid, name: g.data().name, code, kind: g.data().kind };
}

export async function leaveGroup(gid: string) {
  const { db, uid } = await connectCloud();
  const { doc, deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'groups', gid, 'members', uid)).catch(() => {});
}

/** This week's total for a group, live. */
export function useGroupWeek(gid: string | null): number | null {
  const [grams, setGrams] = useState<number | null>(null);
  useEffect(() => {
    if (!gid) return;
    let stop = () => {};
    let alive = true;
    (async () => {
      const { db } = await connectCloud();
      const { doc, onSnapshot } = await import('firebase/firestore');
      if (alive) stop = onSnapshot(doc(db, 'groups', gid, 'weeks', weekId()), (s) => setGrams(s.data()?.grams ?? 0), () => setGrams(null));
    })().catch(() => {});
    return () => { alive = false; stop(); };
  }, [gid]);
  return grams;
}

export interface OwnedGroup extends GroupRef { members: number; grams: number }

/** The classes a signed-in teacher owns, with member counts and this week's totals. */
export async function myGroups(): Promise<OwnedGroup[]> {
  const { db, uid } = await connectCloud();
  const { collection, query, where, getDocs, getCountFromServer, doc, getDoc } = await import('firebase/firestore');
  const snap = await getDocs(query(collection(db, 'groups'), where('ownerUid', '==', uid)));
  return Promise.all(snap.docs.map(async (d) => {
    const [count, week] = await Promise.all([
      getCountFromServer(collection(db, 'groups', d.id, 'members')),
      getDoc(doc(db, 'groups', d.id, 'weeks', weekId())),
    ]);
    const g = d.data();
    return { id: d.id, name: g.name, code: g.code, kind: g.kind, members: count.data().count, grams: week.data()?.grams ?? 0 };
  }));
}
