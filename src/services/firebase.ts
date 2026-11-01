import type { Firestore } from 'firebase/firestore';

/**
 * Firebase connection (project "PlasticPulse", plasticpulse-a921c).
 *
 * This web config is a public identifier, not a secret: every Firebase web app ships it.
 * What protects the data is firestore.rules. Secret keys (Gemini) still never go in the app.
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
  uid: string;
}

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
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    return { db, uid: user.uid };
  })().catch((err) => {
    ready = null; // let the next call retry (offline, sign-in disabled, …)
    throw err;
  });
  return ready;
}
