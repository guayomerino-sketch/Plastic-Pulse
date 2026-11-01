import React, { useState } from 'react';
import { currentProblem, EXAMPLE_IDEAS, PROBLEMS, XP } from '../data/content';
import { useGame } from '../game/store';
import { Icon } from '../components/ui';

export default function Solutions() {
  const { state, dispatch } = useGame();
  const problem = currentProblem();
  const [form, setForm] = useState({ title: '', problem: '', idea: '', evidence: '' });
  const [open, setOpen] = useState(false);
  const valid = form.title.trim().length > 3 && form.idea.trim().length > 10;

  const ideas = [...state.ideas, ...EXAMPLE_IDEAS];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    dispatch({ type: 'idea/add', idea: { problemId: problem.id, ...form } });
    setForm({ title: '', problem: '', idea: '', evidence: '' });
    setOpen(false);
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label accent">Solution Lab · problem of the week</div>
        <h1>{problem.title}</h1>
        <p className="muted">{problem.brief} Think beyond the recycling bin. Pitch it like a scientist: problem, idea, evidence.</p>
      </header>

      {!open ? (
        <button className="btn dashed" onClick={() => setOpen(true)}>+ Pitch your idea · +{XP.idea} XP</button>
      ) : (
        <form className="glass panel form" onSubmit={submit}>
          <label htmlFor="f-title">Idea in one line</label>
          <input id="f-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cap tiles for our school benches" />
          <label htmlFor="f-problem">Problem</label>
          <textarea id="f-problem" rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="What exactly goes wrong, and for whom?" />
          <label htmlFor="f-idea">Idea</label>
          <textarea id="f-idea" rows={3} value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} placeholder="What would you build, change or ask for?" />
          <label htmlFor="f-evidence">Evidence</label>
          <textarea id="f-evidence" rows={2} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="What did you count, survey or test?" />
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!valid}>Submit idea</button>
          </div>
        </form>
      )}
      <p className="scribble">Ideas that involve melting plastic need a makerspace and an adult supervisor.</p>

      <div className="list">
        {ideas.map((it) => {
          const voted = state.votedIdeaIds.includes(it.id);
          const prob = PROBLEMS.find((p) => p.id === it.problemId);
          return (
            <article key={it.id} className="glass idea">
              <div className="grow">
                <div className="row-start">
                  {it.mine && <span className="tag-pill green">YOUR IDEA</span>}
                  {it.example && <span className="tag-pill">EXAMPLE</span>}
                  {prob && <span className="label">{prob.title}</span>}
                </div>
                <div className="idea-title">{it.title}</div>
                {it.problem && <p><b className="k-problem">Problem</b> {it.problem}</p>}
                <p><b className="k-idea">Idea</b> {it.idea}</p>
                {it.evidence && <p><b className="k-evidence">Evidence</b> {it.evidence}</p>}
              </div>
              <button className={`vote ${voted ? 'on' : ''}`} aria-pressed={voted} aria-label={`${voted ? 'Remove vote for' : 'Vote for'} ${it.title}`} onClick={() => dispatch({ type: 'idea/vote', id: it.id })}>
                <Icon name="up" size={18} />
                <span>{it.votes + (voted ? 1 : 0)}</span>
              </button>
            </article>
          );
        })}
      </div>
      <div className="tag">Community voting and peer review go live in the next update. Examples are labeled.</div>
    </div>
  );
}
