import { connectCloud } from './firebase';

/**
 * Pilot feedback, saved to Firestore `feedback/{auto id}`.
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
