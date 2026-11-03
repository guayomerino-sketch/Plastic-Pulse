import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../types';
import { connectCloud, signInWithGoogle, signOutToGuest, watchAccount, type Account } from './firebase';
import { useGame } from '../game/store';

/**
 * Cross-device saving for players signed in with Google.
 *
 *   users/{uid}   { state: <the game state as JSON>, updatedAt }   readable and writable only by that player
 *
 * Guests keep playing exactly as before, saved on their device. Signing in merges this device's progress
 * with the account's, then every change is saved to the account a few seconds later.
 */
const SAVE_DELAY = 3000;

async function loadCloud(uid: string): Promise<GameState | null> {
  const { db } = await connectCloud();
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', uid));
  const raw = snap.data()?.state;
  return typeof raw === 'string' ? (JSON.parse(raw) as GameState) : null;
}

async function saveCloud(uid: string, state: GameState) {
  const { db } = await connectCloud();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), { state: JSON.stringify({ ...state, discovery: null }), updatedAt: serverTimestamp() });
}

export type AccountStatus = { account: Account | null; syncing: boolean; error: string | null };

export function useAccount() {
  const { state, dispatch } = useGame();
  const [account, setAccount] = useState<Account | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const synced = useRef<string | null>(null); // the account uid whose cloud copy is merged in

  useEffect(() => watchAccount(setAccount), []);

  // After signing in (on this device or a returning visit), merge the account's saved progress once.
  useEffect(() => {
    if (account?.kind !== 'google' || synced.current === account.uid) return;
    let alive = true;
    setSyncing(true);
    loadCloud(account.uid)
      .then((cloud) => { if (alive && cloud) dispatch({ type: 'merge', cloud }); if (alive) synced.current = account.uid; })
      .catch(() => alive && setError('Couldn’t load your saved progress. Check your connection.'))
      .finally(() => alive && setSyncing(false));
    return () => { alive = false; };
  }, [account, dispatch]);

  // Save to the account a few seconds after each change.
  useEffect(() => {
    if (account?.kind !== 'google' || synced.current !== account.uid) return;
    const t = window.setTimeout(() => { saveCloud(account.uid, state).catch(() => setError('Couldn’t save to your account. We’ll try again.')); }, SAVE_DELAY);
    return () => window.clearTimeout(t);
  }, [state, account, syncing]);

  const signIn = async () => {
    setError(null);
    try { setAccount(await signInWithGoogle()); } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(code === 'auth/popup-blocked' ? 'Your browser blocked the sign-in window. Allow pop-ups and try again.'
        : code === 'auth/unauthorized-domain' ? 'Sign-in isn’t set up for this address yet.'
        : 'Sign-in didn’t work. Try again in a moment.');
    }
  };

  // On a shared device (a school computer), signing out clears this device; the progress stays in the account.
  const signOut = async () => {
    setError(null);
    if (account?.kind === 'google') await saveCloud(account.uid, state).catch(() => {});
    synced.current = null;
    await signOutToGuest();
    dispatch({ type: 'reset' });
  };

  return { account, syncing, error, signIn, signOut };
}
