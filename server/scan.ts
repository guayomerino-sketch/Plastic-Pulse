import Anthropic from '@anthropic-ai/sdk';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { SPECIMENS } from '../src/data/specimens.js';
import { isMaterialId, type MaterialId } from '../src/data/materials.js';

/**
 * AI photo scanner, server side. The Anthropic key lives only in Vercel's environment (ANTHROPIC_API_KEY).
 * Claude names any item and guesses its plastic family. If it matches one of our sourced specimens,
 * the player gets that Specimen File; otherwise a "Field find" with facts from our sourced materials
 * table. Every fact and number the player sees comes from our data, never from the AI.
 * Photos are analysed and dropped: nothing is stored, and Anthropic does not train on API data.
 *
 * Cost: set a monthly spend limit in the Anthropic Console. When it is reached the API answers
 * 429 or 400, and the game asks the player to pick by hand.
 */
export const MAX_IMAGE_CHARS = 1_400_000; // ~1 MB of JPEG as base64; the app sends ~768 px images
const PROJECT = 'plasticpulse-a921c';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const PER_PLAYER_PER_HOUR = 30; // room to explore; the monthly spend limit is the real cap

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

// Best effort per server instance; the Anthropic spend limit is the hard cap.
const recent = new Map<string, number[]>();
function rateLimit(uid: string) {
  const now = Date.now(), hour = 3_600_000;
  const times = (recent.get(uid) ?? []).filter((t) => now - t < hour);
  if (times.length >= PER_PLAYER_PER_HOUR) throw new ScanError(429, 'too-many-scans');
  times.push(now); recent.set(uid, times);
}

const SYSTEM = `You are the scanner in Plastic Pulse, a science game for players aged 13 and up.
Players photograph everyday objects to learn which parts are plastic.
Only describe the main object. Never describe people, faces, bodies, places, screens or text about people, or anything private.
If the photo shows no everyday object (for example only a person, or something unsafe), answer label "No object found", plastic "unsure", material "UNKNOWN", parts "", confidence 0.
Keep every word friendly and suitable for teens.`;

/** Ask Claude what the item is and which plastic it holds. */
export async function identify(uid: string, image: unknown): Promise<ScanAnswer> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^['"]|['"]$/g, ''); // tolerate stray spaces or quotes from pasting
  if (!apiKey) throw new ScanError(503, 'not-configured');
  if (typeof image !== 'string' || image.length < 100 || image.length > MAX_IMAGE_CHARS || !/^[A-Za-z0-9+/=]+$/.test(image)) throw new ScanError(400, 'bad-image');
  rateLimit(uid);

  const list = SPECIMENS.map((s) => `- ${s.id}: ${s.name} (${s.polymer})`).join('\n');
  const prompt = `Look at the main object in the photo.
1. label: what it is, at most 6 plain words (e.g. "milk carton with plastic cap").
2. specimenId: if it is one of these items, its id, otherwise "none":
${list}
3. plastic: "yes" if mostly plastic, "partly" if it has plastic parts or layers, "no" if no plastic, "unsure".
4. material: the main plastic family: PET, HDPE, PVC, LDPE, PP, PS, OTHER (any other plastic),
   MULTILAYER (fused layers such as plastic-lined paper or metallised film), NONE (no plastic), UNKNOWN.
   If a recycling number in a triangle is visible, use it (1 PET, 2 HDPE, 3 PVC, 4 LDPE, 5 PP, 6 PS, 7 OTHER).
5. parts: at most 12 words on which parts are plastic and which are not.
6. confidence: 0 to 1.`;

  const client = new Anthropic({ apiKey, timeout: 35_000, maxRetries: 1 });
  let msg: Anthropic.Beta.BetaMessage;
  try {
    msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2048,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // if a request is declined, Anthropic retries it on its recommended fallback model
      system: SYSTEM,
      output_config: {
        effort: 'low', // naming an object is a quick look, not a hard problem
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              specimenId: { type: 'string', enum: ['none', ...SPECIMENS.map((s) => s.id)] },
              plastic: { type: 'string', enum: ['yes', 'partly', 'no', 'unsure'] },
              material: { type: 'string', enum: ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS', 'OTHER', 'MULTILAYER', 'NONE', 'UNKNOWN'] },
              parts: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['label', 'specimenId', 'plastic', 'material', 'parts', 'confidence'],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: prompt },
        ],
      }],
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      // Anthropic's own short reason (never contains the key), to tell a bad key from a busy model.
      const reason = String((err.error as { error?: { message?: string } } | undefined)?.error?.message ?? err.message).slice(0, 200);
      console.error('anthropic error', err.status, reason);
      if (err.status === 429 || err.status === 529 || (err.status ?? 0) >= 500) throw new ScanError(429, 'busy', reason); // shown as "resting"
      if (err.status === 400 && /credit|spend|limit|billing/i.test(reason)) throw new ScanError(429, 'daily-limit', reason);
      throw new ScanError(502, `anthropic-${err.status ?? 'error'}`, reason);
    }
    console.error('anthropic timeout or network error', err);
    throw new ScanError(429, 'busy');
  }
  if (msg.stop_reason === 'refusal') throw new ScanError(422, 'declined');
  const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  let out: Partial<ScanAnswer> & { specimenId?: string } = {};
  try { out = JSON.parse(text); } catch { throw new ScanError(502, 'unreadable-answer'); }
  if (/^no object found$/i.test(String(out.label ?? '').trim())) throw new ScanError(422, 'no-object');
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
