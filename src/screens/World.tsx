import React, { useEffect, useState } from 'react';
import { GOODALL_QUOTE, RANKS, SHARED_GOAL } from '../data/content';
import { rankFor, useGame } from '../game/store';
import { useSharedGoal } from '../services/sharedGoal';
import { dateLabel, useVitals } from '../vitals/useVitals';
import { REEF_LEVELS, type Source, type Vitals } from '../vitals/types';

const mass = (g: number) => (g >= 1_000_000 ? `${(g / 1_000_000).toFixed(1)} t` : g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`);
const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);
const signed = (n: number, unit = '') => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}${unit}`;

type VitalId = 'co2' | 'arctic' | 'reef' | 'amazon';
const PLACES: Record<VitalId, [number, number]> = { co2: [19.54, -155.58], arctic: [80, 0], reef: [-18, 147.5], amazon: [-3.4, -62.2] };

interface Props {
  onFeedback: () => void;
  onFocus: (place: [number, number] | null) => void;
  onZoomOut: () => void;
  onVitals: (v: Vitals) => void;
}

export default function World({ onFeedback, onFocus, onZoomOut, onVitals }: Props) {
  const [tab, setTab] = useState<'planet' | 'us'>('planet');
  const [open, setOpen] = useState<VitalId | null>(null);
  const vitals = useVitals();
  const v = vitals.state === 'ok' ? vitals.vitals : null;

  useEffect(() => { if (v) onVitals(v); }, [v, onVitals]);
  useEffect(() => () => onFocus(null), [onFocus]);
  const pick = (id: VitalId | null) => { setOpen(id); onFocus(id ? PLACES[id] : null); };

  return (
    <div className="bottom-dock">
      <section className="glass panel world-panel" aria-label="Earth">
        <div className="seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={tab === 'planet'} className={tab === 'planet' ? 'on' : ''} onClick={() => { setTab('planet'); }}>Planet’s vital signs</button>
          <button role="tab" aria-selected={tab === 'us'} className={tab === 'us' ? 'on' : ''} onClick={() => { setTab('us'); pick(null); }}>Our choices</button>
        </div>
        {tab === 'planet' ? <Planet status={vitals.state} v={v} open={open} pick={pick} onZoomOut={onZoomOut} /> : <Us onFeedback={onFeedback} />}
      </section>
    </div>
  );
}

/* ---------- the planet's vital signs ---------- */

function Planet({ status, v, open, pick, onZoomOut }: { status: string; v: Vitals | null; open: VitalId | null; pick: (id: VitalId | null) => void; onZoomOut: () => void }) {
  const [far, setFar] = useState(false);
  if (status === 'loading') return <p className="note" role="status">Reading the planet’s vital signs…</p>;
  if (!v) return <p className="note" role="status">The vital signs need a connection. Try again in a moment.</p>;
  if (open) return <Detail id={open} v={v} onBack={() => pick(null)} />;

  const tiles: { id: VitalId; name: string; value: string; chip: string; tone: 'bad' | 'warn' | 'ok' } [] = [];
  if (v.co2.status === 'ok') tiles.push({ id: 'co2', name: 'CO₂ in the air', value: `${v.co2.ppm.toFixed(1)} ppm`, chip: `${signed(Math.round(v.co2.ppm - v.co2.ppm1990))} since 1990`, tone: 'bad' });
  if (v.arctic.status === 'ok') { const p = pct(v.arctic.extent, v.arctic.normal); tiles.push({ id: 'arctic', name: 'Arctic sea ice', value: `${v.arctic.extent.toFixed(2)} M km²`, chip: `${signed(p, '%')} vs normal`, tone: p < -5 ? 'bad' : p < 0 ? 'warn' : 'ok' }); }
  if (v.reef.status === 'ok') tiles.push({ id: 'reef', name: 'Great Barrier Reef', value: REEF_LEVELS[v.reef.level], chip: `${signed(Number(v.reef.ssta.toFixed(1)), ' °C')} vs normal`, tone: v.reef.level >= 3 ? 'bad' : v.reef.level >= 1 || v.reef.ssta >= 1 ? 'warn' : 'ok' });
  if (v.amazon.status === 'ok') { const p = pct(v.amazon.km2, v.amazon.km2YearAgo); tiles.push({ id: 'amazon', name: 'Amazon forest loss', value: `${Math.round(v.amazon.km2)} km²`, chip: `${signed(p, '%')} vs last year`, tone: p > 0 ? 'bad' : 'ok' }); }

  return (
    <>
      <div className="vital-grid">
        {tiles.map((t) => (
          <button key={t.id} className="vital" onClick={() => pick(t.id)}>
            <span className="label">{t.name}</span>
            <span className="vital-value">{t.value}</span>
            <span className={`vital-chip ${t.tone}`}>{t.chip}</span>
          </button>
        ))}
      </div>
      {tiles.length < 4 && <p className="tag">Some feeds are not answering right now. We show only real readings, never guesses.</p>}
      <div className="row">
        <span className="tag">Live data · tap a sign to fly there</span>
        <button className="btn ghost small" onClick={() => { setFar(true); onZoomOut(); }}>See Earth from afar</button>
      </div>
      {far && <p className="note" role="status">In 1990, Voyager 1 looked back from about 6 billion km away and photographed Earth as a single pale blue dot. Every forest, reef and person is on it. <a href="https://science.nasa.gov/mission/voyager/" target="_blank" rel="noreferrer">NASA</a></p>}
    </>
  );
}

function SourceLine({ date, source }: { date: string; source: Source }) {
  return <p className="tag">Measured {dateLabel(date)} · <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></p>;
}

function Spark({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values), w = 300, h = 44;
  const pts = values.map((y, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((y - lo) / (hi - lo || 1)) * (h - 8)}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Detail({ id, v, onBack }: { id: VitalId; v: Vitals; onBack: () => void }) {
  const back = <button className="btn ghost small" onClick={onBack}>← All signs</button>;
  if (id === 'co2' && v.co2.status === 'ok') {
    const c = v.co2;
    return (
      <div className="vital-detail">
        <div className="row"><span className="label accent">CO₂ in the air · Mauna Loa, Hawai‘i</span>{back}</div>
        <div className="vital-big">{c.ppm.toFixed(1)} <small>ppm</small></div>
        <p className="note">On this day in 1990 it was {c.ppm1990.toFixed(1)} ppm. One year ago, {c.ppmYearAgo.toFixed(1)} ppm.</p>
        <Spark values={c.series} label="CO₂ over the last 12 months" />
        <p className="note">The line rises and falls through the year as northern forests grow leaves and drop them: the planet breathing. Each year the whole curve sits higher. Burning fossil fuels drives that rise, and plastic is made from fossil fuels: its life cycle caused about 3.4% of the world’s greenhouse gas emissions in 2019 (OECD).</p>
        <p className="question">If CO₂ dips every northern summer, why does the yearly average keep climbing?</p>
        <SourceLine date={c.date} source={c.source} />
      </div>
    );
  }
  if (id === 'arctic' && v.arctic.status === 'ok') {
    const a = v.arctic;
    return (
      <div className="vital-detail">
        <div className="row"><span className="label accent">Arctic sea ice</span>{back}</div>
        <div className="vital-big">{a.extent.toFixed(2)} <small>million km²</small></div>
        <p className="note">The 1981–2010 average for this day is {a.normal.toFixed(2)} million km², so today is {signed(pct(a.extent, a.normal), '%')}. On the globe, the white cap has today’s area and the gold ring shows where normal would reach. (Real ice has a ragged edge; the cap is drawn as a circle of the same area.)</p>
        <Spark values={a.series} label="Arctic sea ice over the last 60 days" />
        <p className="note">Warmer air and oceans, driven by greenhouse gases, melt more ice in summer and let less form in winter.</p>
        <p className="question">Ice reflects sunlight and open water absorbs it. What happens next when the ice shrinks?</p>
        <SourceLine date={a.date} source={a.source} />
      </div>
    );
  }
  if (id === 'reef' && v.reef.status === 'ok') {
    const r = v.reef;
    return (
      <div className="vital-detail">
        <div className="row"><span className="label accent">Great Barrier Reef · NOAA bleaching alert</span>{back}</div>
        <div className="vital-big">{REEF_LEVELS[r.level]}</div>
        <ul className="stations">
          {r.stations.map((s) => <li key={s.name}><span>{s.name}</span><span className={`lvl l${s.level}`}>{REEF_LEVELS[s.level]}</span><span className="tag">{signed(Number(s.ssta.toFixed(1)), ' °C')}</span></li>)}
        </ul>
        <p className="note">The sea is {r.ssta.toFixed(1)} °C {r.ssta >= 0 ? 'warmer' : 'cooler'} than normal for this time of year. Corals bleach when water stays too warm for too long; NOAA’s scale runs from No stress through Watch and Warning to Alert levels, where bleaching becomes likely.</p>
        <p className="question">{r.level === 0 ? 'The water is warmer than normal, but the corals are not under stress yet. What would have to happen for that to change?' : 'Bleaching stress is building. What could help a reef recover once the water cools?'}</p>
        <SourceLine date={r.date} source={r.source} />
      </div>
    );
  }
  if (id === 'amazon' && v.amazon.status === 'ok') {
    const z = v.amazon;
    return (
      <div className="vital-detail">
        <div className="row"><span className="label accent">Amazon forest loss · Brazil</span>{back}</div>
        <div className="vital-big">{Math.round(z.km2)} <small>km² in 30 days</small></div>
        <p className="note">INPE’s satellites flagged {z.km2.toFixed(0)} km² of clear-cutting and mining in the 30 days to {dateLabel(z.date)}. The same 30 days last year: {z.km2YearAgo.toFixed(0)} km² ({signed(pct(z.km2, z.km2YearAgo), '%')}). These are early-warning alerts, not the final yearly figure.</p>
        <p className="note">The forest is cleared by people for farmland, mining and roads. Standing forest stores carbon; cleared land releases it.</p>
        <p className="question">What could make a standing forest worth more than a cleared one?</p>
        <SourceLine date={z.date} source={z.source} />
      </div>
    );
  }
  return <div className="vital-detail"><div className="row"><span className="note">This reading is not available right now.</span>{back}</div></div>;
}

/* ---------- our choices ---------- */

function Us({ onFeedback }: { onFeedback: () => void }) {
  const { state } = useGame();
  const rank = rankFor(state);
  const goal = useSharedGoal();
  const live = goal.state === 'live' ? goal : null;
  const p = live ? Math.min(100, Math.round((live.grams / live.targetGrams) * 100)) : 0;
  return (
    <>
      <div className="label">This week · one shared goal</div>
      <div className="title">{SHARED_GOAL.label}</div>
      <div className="bar thick"><i className="tone-good" style={{ width: `${p}%` }} /></div>
      <div className="row">
        <span className="label green">{live ? `${mass(live.grams)} refused together` : goal.state === 'connecting' ? 'Connecting…' : 'Offline'}</span>
        <span className="label">You: <b className="strong">{mass(live ? live.mine : 0)}</b></span>
      </div>
      <div className="path" aria-label={`Rank: ${rank.current.name}`}>
        {RANKS.map((r, i) => (
          <div key={r.id} className={`path-step ${i < rank.index ? 'done' : i === rank.index ? 'now' : ''}`}>
            <i /><span>{r.name.replace('Field ', '').replace('Biome ', '')}</span>
          </div>
        ))}
      </div>
      <p className="note">Our grams won’t visibly move the planet’s vital signs: those change through billions of choices. Every one of them counts, ours included.</p>
      <blockquote className="quote-sm">“{GOODALL_QUOTE}”<cite>— Jane Goodall</cite></blockquote>
      {goal.state === 'offline' && <div className="tag">The shared goal needs a connection. Your choices still count on this device.</div>}
      <div className="tag">Each light on Earth is a community of players · city lights are sample data for now</div>
      <button className="btn ghost-violet" onClick={onFeedback}>Tell us what you think</button>
    </>
  );
}
