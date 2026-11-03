import { createRemoteJWKSet, jwtVerify } from 'jose';
import { SPECIMENS } from '../src/data/specimens.js';
import { isMaterialId, type MaterialId } from '../src/data/materials.js';

/**
 * AI photo scanner, server side. The Gemini key lives only in Vercel's environment (GEMINI_API_KEY).
 * Gemini names any item and guesses its plastic family. If it matches one of our sourced specimens,
 * the player gets that Specimen File; otherwise a "Field find" with facts from our sourced materials
 * table. Every fact and number the player sees comes from our data, never from the AI.
 *
 * Cost: use a key from a Google project without billing. Then it can never be charged; when the
 * free allowance runs out, Gemini answers 429 and the game asks the player to pick by hand.
 */
export const MAX_IMAGE_CHARS = 1_400_000; // ~1 MB of JPEG as base64; the app sends ~768 px images
const PROJECT = 'plasticpulse-a921c';
// Flash-Lite first: fast, less in demand, and plenty to tell a bottle from a tea bag. Others are fallbacks.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash-lite'];
const PER_PLAYER_PER_HOUR = 30; // room to explore; Gemini's free daily limit is the real cap

export type PlasticVerdict = 'yes' | 'partly' | 'no' | 'unsure';
export interface ScanAnswer {
  specimenId: string | null; // one of our sourced specimens, or null
  label: string; // what the item is, in a few words
  confidence: number;
  plastic: PlasticVerdict; // is it plastic?
  material: MaterialId; // its main plastic family
  parts: string; // short note on which parts are plastic, e.g. "cap PP, carton paper with plastic lining"
}
export class ScanError extends Error { constructor(public status: number, public code: string, public detail = '') { super(code); } }

const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

/** Only players signed in to Plastic Pulse (guests included) can scan. Returns their id. */
export async function verifyPlayer(authHeader: string | null): Promise<string> {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ScanError(401, 'sign-in-required');
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: `https://securetoken.google.com/${PROJECT}`, audience: PROJECT });
    if (!payload.sub) throw new Error('no subject');
    return payload.sub;
  } catch { throw new ScanError(401, 'sign-in-required'); }
}

// Best effort per server instance; Gemini's own free-tier limit is the hard cap.
const recent = new Map<string, number[]>();
function rateLimit(uid: string) {
  const now = Date.now(), hour = 3_600_000;
  const times = (recent.get(uid) ?? []).filter((t) => now - t < hour);
  if (times.length >= PER_PLAYER_PER_HOUR) throw new ScanError(429, 'too-many-scans');
  times.push(now); recent.set(uid, times);
}

/** Ask Gemini which specimen is in the photo. */
export async function identify(uid: string, image: unknown): Promise<ScanAnswer> {
  const key = process.env.GEMINI_API_KEY?.trim().replace(/^['"]|['"]$/g, ''); // tolerate stray spaces or quotes from pasting
  if (!key) throw new ScanError(503, 'not-configured');
  if (typeof image !== 'string' || image.length < 100 || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image)) throw new ScanError(400, 'bad-image');
  rateLimit(uid);

  const list = SPECIMENS.map((s) => `- ${s.id}: ${s.name} (${s.polymer})`).join('\n');
  const prompt = `You help young people identify everyday objects and the plastic in them, in a science game.
Look at the main object in the photo.
1. label: what it is, at most 6 plain words (e.g. "milk carton with plastic cap").
2. specimenId: if it is one of these items, its id, otherwise null:
${list}
3. plastic: "yes" if mostly plastic, "partly" if it has plastic parts or layers, "no" if no plastic, "unsure".
4. material: the main plastic family: PET, HDPE, PVC, LDPE, PP, PS, OTHER (any other plastic),
   MULTILAYER (fused layers such as plastic-lined paper or metallised film), NONE (no plastic), UNKNOWN.
   If a recycling number in a triangle is visible, use it (1 PET, 2 HDPE, 3 PVC, 4 LDPE, 5 PP, 6 PS, 7 OTHER).
5. parts: at most 12 words on which parts are plastic and which are not.
6. confidence: 0 to 1.
Only describe the object. Never describe people, faces, places, text about people or anything private.`;

  // Try the main model, then lighter ones when Google is busy (503), overloaded (500) or a name changed (404).
  const models = [...new Set([MODEL, ...FALLBACK_MODELS])];
  let res: Response | null = null, reason = '';
  for (const model of models) {
    res = null;
    try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: image } }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024, // room for models that think before answering
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              specimenId: { type: 'STRING', nullable: true }, label: { type: 'STRING' }, confidence: { type: 'NUMBER' },
              plastic: { type: 'STRING', enum: ['yes', 'partly', 'no', 'unsure'] },
              material: { type: 'STRING', enum: ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'OTHER', 'MULTILAYER', 'NONE', 'UNKNOWN'] },
              parts: { type: 'STRING' },
            },
            required: ['specimenId', 'label', 'confidence', 'plastic', 'material', 'parts'],
          },
        },
      }),
    });
    } catch (err) {
      console.error('gemini timeout or network error', model, err);
      continue; // too slow: try the next model
    }
    if (res.ok) break;
    // Gemini's own short reason (never contains the key), to tell a bad key from a busy model.
    reason = await res.json().then((e) => String(e?.error?.message ?? ''), () => '');
    console.error('gemini error', model, res.status, reason);
    if (![404, 500, 503].includes(res.status)) break;
  }
  if (!res) throw new ScanError(429, 'busy'); // every model timed out: shown as "resting"
  if (res.status === 429) throw new ScanError(429, 'daily-limit');
  if (res.status === 503 || res.status === 500) throw new ScanError(429, 'busy', reason.slice(0, 200)); // shown as "resting"
  if (!res.ok) throw new ScanError(502, `gemini-${res.status}`, reason.slice(0, 200));
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  let out: Partial<ScanAnswer> = {};
  try { out = JSON.parse(text); } catch { throw new ScanError(502, 'unreadable-answer'); }
  const known = SPECIMENS.some((s) => s.id === out.specimenId);
  const clean = (t: unknown, max: number) => String(t ?? '').replace(/[^\p{L}\p{N} '’,.()/+-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const verdicts: PlasticVerdict[] = ['yes', 'partly', 'no', 'unsure'];
  return {
    specimenId: known ? (out.specimenId as string) : null,
    label: clean(out.label, 60) || 'Unknown item',
    confidence: Math.max(0, Math.min(1, Number(out.confidence) || 0)),
    plastic: verdicts.includes(out.plastic as PlasticVerdict) ? (out.plastic as PlasticVerdict) : 'unsure',
    material: isMaterialId(out.material) ? out.material : 'UNKNOWN',
    parts: clean(out.parts, 100),
  };
}
