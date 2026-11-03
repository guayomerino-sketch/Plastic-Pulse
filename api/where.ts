/**
 * GET /api/where: the visitor's rough city, from the location Vercel already attaches to each request.
 * No GPS, no prompt, nothing stored. Coordinates are rounded to 0.1° (about 10 km) before they leave here.
 * Used only to add a player's refused plastic to their city's light on the globe.
 */
export function GET(request: Request) {
  const h = request.headers;
  const city = decodeURIComponent(h.get('x-vercel-ip-city') ?? '').trim();
  const country = (h.get('x-vercel-ip-country') ?? '').toUpperCase();
  const lat = Number(h.get('x-vercel-ip-latitude')), lng = Number(h.get('x-vercel-ip-longitude'));
  const ok = city && /^[A-Z]{2}$/.test(country) && Number.isFinite(lat) && Number.isFinite(lng);
  const body = ok ? { city: city.slice(0, 60), country, lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 } : {};
  return Response.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
}
