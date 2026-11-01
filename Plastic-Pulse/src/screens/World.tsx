import React from 'react';
import { GOODALL_QUOTE, RANKS, SHARED_GOAL_SAMPLE } from '../data/content';
import { impactFor, rankFor, useGame } from '../game/store';

export default function World() {
  const { state } = useGame();
  const impact = impactFor(state);
  const rank = rankFor(state);
  const g = SHARED_GOAL_SAMPLE;
  const pct = Math.round((g.currentKg / g.targetKg) * 100);

  return (
    <div className="bottom-dock">
      <section className="glass panel" aria-label="Shared goal">
        <div className="label">This week · one shared goal</div>
        <div className="title">{g.label}</div>
        <div className="bar thick"><i className="tone-good" style={{ width: `${pct}%` }} /></div>
        <div className="row">
          <span className="label green">{(g.currentKg / 1000).toFixed(1)} t refused</span>
          <span className="label">Your part: <b className="strong">{impact.gramsAvoided} g</b> · {impact.refused + impact.reused} choices</span>
        </div>
        <div className="path" aria-label={`Rank: ${rank.current.name}`}>
          {RANKS.map((r, i) => (
            <div key={r.id} className={`path-step ${i < rank.index ? 'done' : i === rank.index ? 'now' : ''}`}>
              <i /><span>{r.name.replace('Field ', '').replace('Biome ', '')}</span>
            </div>
          ))}
        </div>
        <blockquote className="quote-sm">“{GOODALL_QUOTE}”<cite>— Jane Goodall</cite></blockquote>
        {g.isSample && <div className="tag">EACH LIGHT IS A COMMUNITY OF PLAYERS · SAMPLE DATA UNTIL THE NEXT UPDATE</div>}
      </section>
    </div>
  );
}
