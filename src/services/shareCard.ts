import type { GameState, Specimen } from '../types';
import { SPECIMENS, specimenById } from '../data/specimens';
import { impactFor, isFound, rankFor } from '../game/store';
import { loadVitals } from '../vitals/useVitals';

/**
 * Share cards: images a player can post or send. Drawn on a canvas in the game's own style.
 * No name and no class name ever appear on a card. Numbers come only from the game state,
 * sourced specimen data and the live vital signs (each with its source).
 */
const W = 1080, H = 1350;
const C = { bg: '#04070f', ink: '#f6f9ff', muted: '#9fb3cc', teal: '#3ee6c8', tealSoft: '#7ff3dc', violet: '#d6c8ff', amber: '#ffc566' };
const DISPLAY = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace', SERIF = '"Instrument Serif", Georgia, serif';
const URL_TEXT = 'plastic-pulse.vercel.app';

async function ready() {
  await Promise.all([`700 64px ${DISPLAY}`, `500 24px ${MONO}`, `italic 40px ${SERIF}`].map((f) => document.fonts.load(f).catch(() => {})));
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

function background(g: CanvasRenderingContext2D) {
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 470, 60, W / 2, 470, 760);
  glow.addColorStop(0, 'rgba(20, 90, 100, 0.55)'); glow.addColorStop(1, 'rgba(4, 7, 15, 0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 170; i++) { g.fillStyle = `rgba(220, 235, 255, ${0.25 + rnd() * 0.6})`; g.fillRect(rnd() * W, rnd() * H, rnd() < 0.85 ? 1.5 : 2.5, rnd() < 0.85 ? 1.5 : 2.5); }
}

/** A glowing Earth drawn from the game's own day texture. */
async function globe(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const atm = g.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.35);
  atm.addColorStop(0, 'rgba(90, 160, 255, 0.55)'); atm.addColorStop(1, 'rgba(90, 160, 255, 0)');
  g.fillStyle = atm; g.beginPath(); g.arc(cx, cy, r * 1.35, 0, Math.PI * 2); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  const day = await loadImage('/textures/earth-day.jpg');
  if (day) {
    const h = r * 2, w = h * 2; // equirectangular: show the Americas
    g.drawImage(day, cx - w * 0.29, cy - r, w, h);
  } else { g.fillStyle = '#1d6fa5'; g.fillRect(cx - r, cy - r, r * 2, r * 2); }
  const shade = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r * 1.05);
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.10)'); shade.addColorStop(0.55, 'rgba(0, 0, 0, 0)'); shade.addColorStop(1, 'rgba(2, 6, 18, 0.85)');
  g.fillStyle = shade; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
  g.strokeStyle = 'rgba(127, 243, 220, 0.5)'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(cx, cy + 10, r * 1.45, r * 0.32, -0.2, 0, Math.PI * 2); g.stroke();
}

function header(g: CanvasRenderingContext2D, label: string) {
  g.textAlign = 'center';
  g.font = `500 24px ${MONO}`; g.fillStyle = C.tealSoft; spaced(g, label, W / 2, 92, 5);
  g.font = `700 76px ${DISPLAY}`;
  const a = g.measureText('PLASTIC ').width, b = g.measureText('PULSE').width, x = (W - a - b) / 2;
  g.textAlign = 'left'; g.fillStyle = C.ink; g.fillText('PLASTIC ', x, 178);
  g.shadowColor = 'rgba(62, 230, 200, 0.7)'; g.shadowBlur = 30; g.fillStyle = C.teal; g.fillText('PULSE', x + a, 178); g.shadowBlur = 0;
}

function spaced(g: CanvasRenderingContext2D, text: string, cx: number, y: number, sp: number) {
  const w = [...text].reduce((n, ch) => n + g.measureText(ch).width + sp, -sp);
  let x = cx - w / 2; const align = g.textAlign; g.textAlign = 'left';
  for (const ch of text) { g.fillText(ch, x, y); x += g.measureText(ch).width + sp; }
  g.textAlign = align;
}

function glassBox(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 30, tint = 'rgba(255,255,255,0.07)') {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  g.fillStyle = tint; g.fill();
  g.strokeStyle = 'rgba(255, 255, 255, 0.18)'; g.lineWidth = 2; g.stroke();
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 6) {
  const words = text.split(' '); let line = '', lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      if (++lines >= maxLines) { g.fillText(`${line}…`, x, y); return y + lh; }
      g.fillText(line, x, y); y += lh; line = w;
    } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

function footer(g: CanvasRenderingContext2D) {
  g.textAlign = 'center';
  g.font = `700 44px ${DISPLAY}`; g.fillStyle = C.ink; g.fillText(`Play: ${URL_TEXT}`, W / 2, H - 92);
  g.font = `500 22px ${MONO}`; g.fillStyle = C.muted; spaced(g, 'FREE · NO SIGN-UP · AGES 13+', W / 2, H - 46, 3);
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));

/** "My field report": the player's progress plus one live planet reading. */
export async function progressCard(state: GameState): Promise<Blob> {
  await ready();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  background(g);
  header(g, 'FIELD REPORT');
  await globe(g, W / 2, 470, 200);

  const impact = impactFor(state), rank = rankFor(state);
  const choices = impact.refused + impact.reused;
  g.textAlign = 'center';
  g.font = `700 92px ${DISPLAY}`; g.fillStyle = C.ink; g.fillText(`${choices}`, W / 2, 790);
  g.font = `600 36px ${DISPLAY}`; g.fillStyle = C.tealSoft;
  g.fillText(choices === 1 ? 'plastic refused or reused' : 'plastics refused or reused', W / 2, 840);
  if (impact.gramsAvoided > 0) { g.font = `500 26px ${MONO}`; g.fillStyle = C.muted; g.fillText(`≈ ${impact.gramsAvoided.toLocaleString()} g kept out of the environment`, W / 2, 886); }

  const found = SPECIMENS.filter((s) => isFound(state, s.id)).length;
  const tiles: [string, string, string][] = [['RANK', rank.current.name, C.tealSoft], ['SPECIMENS', `${found}/${SPECIMENS.length}`, C.violet], ['STREAK', `${state.streakDays} day${state.streakDays === 1 ? '' : 's'}`, C.amber]];
  const tw = 300, gap = 30, tx = (W - tw * 3 - gap * 2) / 2;
  tiles.forEach(([k, v, col], i) => {
    const x = tx + i * (tw + gap);
    glassBox(g, x, 930, tw, 130, 28);
    g.textAlign = 'center'; g.font = `500 20px ${MONO}`; g.fillStyle = C.muted; spaced(g, k, x + tw / 2, 975, 3);
    g.font = `700 ${v.length > 12 ? 30 : 38}px ${DISPLAY}`; g.fillStyle = col; g.fillText(v, x + tw / 2, 1030);
  });

  const v = await Promise.race([loadVitals().catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
  if (v && v.co2.status === 'ok') {
    g.textAlign = 'center'; g.font = `500 22px ${MONO}`; g.fillStyle = C.muted;
    spaced(g, `TODAY ON EARTH · CO₂ ${v.co2.ppm.toFixed(1)} PPM (+${Math.round(v.co2.ppm - v.co2.ppm1990)} SINCE 1990) · NOAA`, W / 2, 1112, 1);
  }
  footer(g);
  return toBlob(c);
}

const RARITY_COLOR: Record<Specimen['rarity'], string> = { Common: C.tealSoft, Hidden: C.violet, Rare: C.amber };

/** A specimen from the Book, with one sourced fact. */
export async function specimenCard(id: string): Promise<Blob> {
  await ready();
  const s = specimenById(id);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  background(g);
  header(g, 'SPECIMEN DISCOVERED');
  const col = RARITY_COLOR[s.rarity];

  glassBox(g, 80, 250, W - 160, 830, 40, 'rgba(255,255,255,0.06)');
  g.textAlign = 'left';
  g.font = `500 24px ${MONO}`; g.fillStyle = col;
  g.fillText(`${s.rarity === 'Hidden' ? 'HIDDEN PLASTIC' : s.rarity.toUpperCase()} · THREAT ${s.threat.toUpperCase()}`, 130, 320);
  g.font = `700 68px ${DISPLAY}`; g.fillStyle = C.ink;
  let y = wrap(g, s.name, 130, 400, W - 260, 76, 2);
  g.font = `italic 38px ${SERIF}`; g.fillStyle = C.muted;
  y = wrap(g, s.polymer, 130, y + 4, W - 260, 46, 2);
  g.font = `400 34px ${DISPLAY}`; g.fillStyle = '#d3deee';
  y = wrap(g, s.fieldNotes, 130, y + 40, W - 260, 48, 7);
  g.font = `italic 36px ${SERIF}`; g.fillStyle = C.violet;
  wrap(g, `Open question: ${s.openQuestion}`, 130, Math.max(y + 30, 860), W - 260, 44, 3);
  g.font = `500 20px ${MONO}`; g.fillStyle = C.muted;
  wrap(g, `SOURCE · ${s.sources[0]?.label ?? ''}`.toUpperCase(), 130, 1040, W - 260, 26, 2);
  footer(g);
  return toBlob(c);
}

/**
 * Share an image: the phone's share sheet when available (WhatsApp, Instagram, Messages…),
 * otherwise download it.
 */
export async function shareImage(blob: Blob, name: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], `${name}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text: `${text} https://${URL_TEXT}` }); return 'shared'; }
    catch (err) { if ((err as Error).name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
