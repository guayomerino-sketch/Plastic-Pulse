import { connectCloud } from './firebase';

/**
 * "Delete my data": erases this player from Plastic Pulse. Their ideas (community and class),
 * class membership, saved progress and the sign-in itself. The weekly totals they added to stay,
 * as plain numbers that can no longer be linked to anyone once the sign-in is gone.
 */
export class NeedsFreshSignIn extends Error {}

export async function deleteMyData(groupId: string | null): Promise<void> {
  const { auth, db } = await connectCloud();
  const user = auth.currentUser;
  if (!user) return;
  const { collection, deleteDoc, doc, getDocs, query, where, limit } = await import('firebase/firestore');
  const { deleteUser } = await import('firebase/auth');
  const mine = async (path: string) => (await getDocs(query(collection(db, path), where('uid', '==', user.uid), limit(100)))).docs;
  const ideas = [...(await mine('ideas')), ...(groupId ? await mine(`groups/${groupId}/ideas`).catch(() => []) : [])];
  await Promise.all(ideas.map((d) => deleteDoc(d.ref)));
  if (groupId) await deleteDoc(doc(db, 'groups', groupId, 'members', user.uid)).catch(() => {});
  if (!user.isAnonymous) await deleteDoc(doc(db, 'users', user.uid));
  try {
    await deleteUser(user);
  } catch (err) {
    if ((err as { code?: string }).code === 'auth/requires-recent-login') throw new NeedsFreshSignIn('sign in again first');
    throw err;
  }
  try { localStorage.clear(); } catch { /* storage unavailable */ }
}
