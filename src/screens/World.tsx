import React from 'react';
import { GOODALL_QUOTE, RANKS, SHARED_GOAL } from '../data/content';
import { rankFor, useGame } from '../game/store';
import { useSharedGoal } from '../services/sharedGoal';

const mass = (g: number) => (g >= 1_000_000 ? `${(g / 1_000_000).toFixed(1)} t` : g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`);

export default function World({ onFeedback }: { onFeedback: () => void }) {
  const { state } = useGame();
  const rank = rankFor(state);
  const goal = useSharedGoal();
  const live = goal.state === 'live' ? goal : null;
  const pct = live ? Math.min(100, Math.round((live.grams / live.targetGrams) * 100)) : 0;

  return (
    <div className="bottom-dock">
      <section className="glass panel" aria-label="Shared goal">
        <div className="label">This week · one shared goal</div>
        <div className="title">{SHARED_GOAL.label}</div>
        <div className="bar thick"><i className="tone-good" style={{ width: `${pct}%` }} /></div>
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
        <blockquote className="quote-sm">“{GOODALL_QUOTE}”<cite>— Jane Goodall</cite></blockquote>
        {goal.state === 'offline' && <div className="tag">The shared goal needs a connection. Your choices still count on this device.</div>}
        <div className="tag">Each light on Earth is a community of players · city lights are sample data for now</div>
        <button className="btn ghost-violet" onClick={onFeedback}>Tell us what you think</button>
      </section>
    </div>
  );
}
