import type { Firestore } from 'firebase/firestore';
import type { Auth, User } from 'firebase/auth';

/**
 * Firebase connection (project "PlasticPulse", plasticpulse-a921c).
 *
 * This web config is a public identifier, not a secret: every Firebase web app ships it.
 * What protects the data is firestore.rules. Secret keys (the AI scanner key) still never go in the app.
 *
 * Players sign in anonymously: they get a private id without giving a name or email,
 * which fits a 13+ audience and the "no public individual rankings" rule.
 *
 * The SDK is loaded on first use so it never delays the 3D world on budget phones.
 */
const config = {
  apiKey: 'AIzaSyDhYnMFgIllhue31bbhUC_bd9mtIZnJ3Es',
  authDomain: 'plasticpulse-a921c.firebaseapp.com',
  projectId: 'plasticpulse-a921c',
  storageBucket: 'plasticpulse-a921c.firebasestorage.app',
  messagingSenderId: '630513183726',
  appId: '1:630513183726:web:c6ef86e044f45ebab6bcff',
};

export interface Cloud {
  db: Firestore;
  auth: Auth;
  /** The current player's id. Changes when a guest signs in with Google or signs out. */
  readonly uid: string;
}

/** Who is playing: a guest (anonymous) or a Google account. Name and email are never stored in Firestore. */
export type Account = { kind: 'guest'; uid: string } | { kind: 'google'; uid: string; name: string | null };

// Local testing: `npm run dev:emulators` runs the app against the Firebase emulators, not the live project.
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === '1';

let ready: Promise<Cloud> | null = null;

export function connectCloud(): Promise<Cloud> {
  ready ??= (async () => {
    const [{ initializeApp }, { getAuth, signInAnonymously, connectAuthEmulator }, { getFirestore, connectFirestoreEmulator }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = initializeApp(config);
    const auth = getAuth(app);
    const db = getFirestore(app);
    if (useEmulators) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    // Wait for the saved session to load, or every visit would start a new anonymous player.
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
    return { db, auth, get uid() { return auth.currentUser!.uid; } };
  })().catch((err) => {
    ready = null; // let the next call retry (offline, sign-in disabled, …)
    throw err;
  });
  return ready;
}

const toAccount = (u: User): Account => (u.isAnonymous ? { kind: 'guest', uid: u.uid } : { kind: 'google', uid: u.uid, name: u.displayName?.split(' ')[0] ?? null });

/** Calls back with the current account now and whenever it changes. Returns an unsubscribe function. */
export function watchAccount(cb: (a: Account) => void): () => void {
  let stop = () => {};
  let cancelled = false;
  connectCloud().then(async ({ auth }) => {
    // onIdTokenChanged (not onAuthStateChanged) also fires when a guest is upgraded to Google in place.
    const { onIdTokenChanged } = await import('firebase/auth');
    let last = '';
    if (!cancelled) stop = onIdTokenChanged(auth, (u) => {
      if (!u) return;
      const a = toAccount(u), key = `${a.kind}:${a.uid}`;
      if (key !== last) { last = key; cb(a); }
    });
  }).catch(() => {});
  return () => { cancelled = true; stop(); };
}

/**
 * Optional Google sign-in. A guest is upgraded in place (same player id, so nothing is lost).
 * If that Google account already has Plastic Pulse progress, we switch to it and the caller merges.
 */
export async function signInWithGoogle(): Promise<Account> {
  const { auth } = await connectCloud();
  const { GoogleAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) return toAccount((await signInWithPopup(auth, provider)).user);
  try {
    return toAccount((await linkWithPopup(user, provider)).user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const cred = GoogleAuthProvider.credentialFromError(err as never);
    if ((code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') && cred) {
      return toAccount((await signInWithCredential(auth, cred)).user);
    }
    throw err;
  }
}

/** Sign out of Google and continue as a new guest. */
export async function signOutToGuest(): Promise<void> {
  const { auth } = await connectCloud();
  const { signOut, signInAnonymously } = await import('firebase/auth');
  await signOut(auth);
  await signInAnonymously(auth);
}
