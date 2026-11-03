import { connectCloud } from './firebase';

/**
 * Player feedback, saved to Firestore `feedback/{auto id}`.
 * Players can only add feedback, never read it; read it in the Firebase console.
 */
export const COME_BACK = ['yes', 'maybe', 'no'] as const;
export type ComeBack = (typeof COME_BACK)[number];
export const FEEDBACK_MAX = 1000; // keep in sync with firestore.rules

export interface FeedbackForm {
  liked: string;
  confusing: string;
  comeBack: ComeBack | '';
}

// Young players: feedback must not carry contact details. Same patterns as firestore.rules.
const CONTACT = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}/, /[0-9][0-9 ()+.-]{6,}[0-9]/, /(https?:\/\/|www[.])/i];
export const hasContactDetails = (t: string) => CONTACT.some((re) => re.test(t));

export async function sendFeedback(f: FeedbackForm): Promise<void> {
  const { db, uid } = await connectCloud();
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  await addDoc(collection(db, 'feedback'), {
    uid,
    liked: f.liked.trim().slice(0, FEEDBACK_MAX),
    confusing: f.confusing.trim().slice(0, FEEDBACK_MAX),
    comeBack: f.comeBack,
    createdAt: serverTimestamp(),
  });
}
