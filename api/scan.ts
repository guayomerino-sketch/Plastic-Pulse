import { ScanError, identify, verifyPlayer } from '../server/scan.js'; // .js: Node ESM on Vercel needs the extension

/**
 * POST /api/scan  { image: <base64 JPEG> }  →  { specimenId, label, confidence }
 * Signed-in players only (guests included). Photos are sent to Anthropic’s Claude AI to identify the item and are never stored.
 */
export async function POST(request: Request) {
  try {
    const uid = await verifyPlayer(request.headers.get('authorization'));
    const body = await request.json().catch(() => ({}));
    return Response.json(await identify(uid, (body as { image?: unknown }).image), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const e = err instanceof ScanError ? err : new ScanError(500, 'server-error');
    if (!(err instanceof ScanError)) console.error('scan failed', err);
    return Response.json({ error: e.code, ...(e.detail ? { detail: e.detail } : {}) }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
