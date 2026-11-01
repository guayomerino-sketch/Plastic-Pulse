import React, { useState } from 'react';
import { CHALLENGES, XP } from '../data/content';
import { useGame } from '../game/store';
import { Icon } from '../components/ui';

export default function Lab() {
  const { state, dispatch } = useGame();
  const ch = CHALLENGES.find((c) => c.id === state.activeChallengeId) ?? CHALLENGES[0];
  const p = state.lab[ch.id] ?? { hypothesis: '', done: Array(ch.days).fill(false), conclusion: '', completed: false };
  const [conclusion, setConclusion] = useState(p.conclusion);
  const doneCount = p.done.filter(Boolean).length;
  const allDone = doneCount === ch.days;

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label violet">Lab challenge · {ch.days}-day experiment</div>
        <h1>{ch.title}</h1>
        <div className="pills">
          <span className="pill violet">+{ch.xp} XP</span>
          {ch.id === CHALLENGES[0].id && <span className="pill green">Unlocks: Analyst rank</span>}
          {p.completed && <span className="pill green"><Icon name="check" size={12} /> Completed</span>}
        </div>
      </header>

      <section className="glass panel steps">
        <div className="step"><span className="dot solid">Q</span><div><div className="step-t">Question</div><p>{ch.question}</p></div></div>
        <div className="step">
          <span className="dot solid">H</span>
          <div className="grow">
            <label className="step-t" htmlFor="hyp">Your hypothesis</label>
            <textarea id="hyp" rows={2} value={p.hypothesis} placeholder={ch.hypothesisPrompt}
              onChange={(e) => dispatch({ type: 'lab/hypothesis', id: ch.id, text: e.target.value })} disabled={p.completed} />
          </div>
        </div>
        <div className="step"><span className="dot">M</span><div><div className="step-t">Method</div><p>{ch.method}</p></div></div>
      </section>

      <section className="glass panel">
        <div className="row"><div className="step-t">Data · tap a day when it’s done</div><span className="label accent">{doneCount}/{ch.days}</span></div>
        <div className="days" style={{ gridTemplateColumns: `repeat(${ch.days}, minmax(0, 1fr))` }}>
          {p.done.map((on, i) => (
            <button key={i} className={`day ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`Day ${i + 1}`} disabled={p.completed}
              onClick={() => dispatch({ type: 'lab/toggleDay', id: ch.id, day: i })}>{i + 1}</button>
          ))}
        </div>
        <div className="tag">+{XP.labDay} XP per day</div>
      </section>

      <section className={`glass panel ${allDone ? '' : 'dim'}`}>
        <div className="step"><span className="dot">C</span>
          <div className="grow">
            <label className="step-t" htmlFor="conc">Conclusion</label>
            {p.completed ? <p>{p.conclusion}</p> : allDone ? (
              <>
                <textarea id="conc" rows={3} value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Was your hypothesis right? What surprised you?" />
                <button className="btn primary" disabled={conclusion.trim().length < 10} onClick={() => dispatch({ type: 'lab/conclude', id: ch.id, text: conclusion })}>Submit conclusion · +{ch.xp} XP</button>
              </>
            ) : <p className="muted">Unlocks when every day is done. Was your hypothesis right?</p>}
          </div>
        </div>
      </section>
      <p className="scribble">Slips aren’t failures. They’re data. What made them happen?</p>

      <h2 className="section-title">More challenges</h2>
      <div className="list">
        {CHALLENGES.map((c) => (
          <button key={c.id} className={`glass list-item ${c.id === ch.id ? 'on' : ''}`} onClick={() => dispatch({ type: 'lab/select', id: c.id })}>
            <span className="spec-name">{c.title}</span>
            <span className="label">{c.days} days · +{c.xp} XP{state.lab[c.id]?.completed ? ' · done' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
