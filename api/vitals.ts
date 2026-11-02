import { getVitals } from '../server/vitals.js'; // .js: Node ESM on Vercel needs the extension; TypeScript maps it to vitals.ts

/**
 * GET /api/vitals: Earth's vital signs as one small JSON summary.
 * Vercel's CDN keeps each answer for 6 hours and keeps serving it for a day while it refreshes,
 * so the agencies are asked a few times a day at most, however many people play.
 */
export async function GET() {
  const vitals = await getVitals();
  return Response.json(vitals, {
    headers: { 'Cache-Control': 'public, max-age=600, s-maxage=21600, stale-while-revalidate=86400' },
  });
}
