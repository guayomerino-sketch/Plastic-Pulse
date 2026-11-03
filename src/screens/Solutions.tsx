import React, { useEffect, useState } from 'react';
import { currentProblem, EXAMPLE_IDEAS, PROBLEMS, XP } from '../data/content';
import { useGame } from '../game/store';
import { Icon } from '../components/ui';
import { myGroups, type OwnedGroup } from '../services/groups';
import { TooSoon, deleteIdea, pitchIdea, reportIdea, setHidden, setVote, textProblem, useIdeas, useIsModerator, type CloudIdea, type IdeaForm } from '../services/ideas';

const EMPTY: IdeaForm = { title: '', problem: '', idea: '', evidence: '' };

/**
 * Solution Lab: players pitch ideas for the problem of the week. Ideas appear right away (in the class,
 * or for the community); players vote; teachers and the moderator can hide an idea afterwards.
 */
export default function Solutions({ googleUid }: { googleUid: string | null }) {
  const { state, dispatch } = useGame();
  const problem = currentProblem();
  const group = state.group;
  const [form, setForm] = useState<IdeaForm>(EMPTY);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const warning = textProblem(`${form.title} ${form.problem} ${form.idea} ${form.evidence}`);
  const valid = form.title.trim().length >= 4 && form.idea.trim().length > 10 && !warning;

  const classIdeas = useIdeas(group?.id ?? null, group ? { field: 'status', value: 'visible' } : null);
  const community = useIdeas(null, { field: 'status', value: 'visible' });
  const mineCommunity = useIdeas(null, { field: 'uid', value: 'me' });
  const mineClass = useIdeas(group?.id ?? null, group ? { field: 'uid', value: 'me' } : null);
  const mine = new Set([...(mineClass ?? []), ...(mineCommunity ?? [])].map((i) => i.path));
  const hiddenMine = [...(mineClass ?? []), ...(mineCommunity ?? [])].filter((i) => i.status === 'hidden');
  const isMod = useIsModerator(googleUid);
  const [teaching, setTeaching] = useState<OwnedGroup[]>([]);
  useEffect(() => { if (googleUid) myGroups().then(setTeaching).catch(() => setTeaching([])); else setTeaching([]); }, [googleUid]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || sending) return;
    setSending(true); setError('');
    try {
      await pitchIdea(problem.id, form, group?.id ?? null);
      dispatch({ type: 'idea/add', idea: { problemId: problem.id, ...form } }); // XP and the Innovator rank, right away
      setSent(`${group ? `Shared with ${group.name}` : 'Shared with the community'}! +${XP.idea} XP`);
      setForm(EMPTY); setOpen(false);
    } catch (err) {
      setError(err instanceof TooSoon ? 'Nice energy! Wait a minute before sharing your next idea.' : 'Couldn’t share it right now. Check your connection and try again.');
    } finally { setSending(false); }
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label accent">Solution Lab · problem of the week</div>
        <h1>{problem.title}</h1>
        <p className="muted">{problem.brief} Think beyond the recycling bin. Pitch it like a scientist: problem, idea, evidence.</p>
      </header>

      {!open ? (
        <button className="btn dashed" onClick={() => { setOpen(true); setSent(''); }}>+ Pitch your idea · +{XP.idea} XP</button>
      ) : (
        <form className="glass panel form" onSubmit={submit}>
          <label htmlFor="f-title">Idea in one line</label>
          <input id="f-title" maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cap tiles for our school benches" />
          <label htmlFor="f-problem">Problem</label>
          <textarea id="f-problem" rows={2} maxLength={400} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="What exactly goes wrong, and for whom?" />
          <label htmlFor="f-idea">Idea</label>
          <textarea id="f-idea" rows={3} maxLength={600} value={form.idea} onChange={(e) => setForm({ ...form, idea: e.target.value })} placeholder="What would you build, change or ask for?" />
          <label htmlFor="f-evidence">Evidence</label>
          <textarea id="f-evidence" rows={2} maxLength={400} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="What did you count, survey or test?" />
          {warning && <p className="note warn-text" role="alert">{warning}</p>}
          {error && <p className="note warn-text" role="alert">{error}</p>}
          <p className="tag">{group ? `Your class (${group.name}) sees it right away.` : 'The Plastic Pulse community sees it right away.'}</p>
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!valid || sending}>{sending ? 'Sharing…' : 'Share idea'}</button>
          </div>
        </form>
      )}
      {sent && <p className="note shared" role="status">{sent}</p>}
      <p className="scribble">Ideas that involve melting plastic need a makerspace and an adult supervisor.</p>

      {hiddenMine.map((it) => (
        <p key={it.path} className="note hidden-note">“{it.title}” is hidden for now {it.path.startsWith('groups/') ? 'by your teacher' : 'while an adult takes a look'}. You can still see it here.</p>
      ))}

      {group && <IdeaList title={`Ideas from ${group.name}`} ideas={classIdeas} mine={mine} empty="No class ideas yet. Be the first!" />}
      <IdeaList title="Community ideas" ideas={community} mine={mine} empty={null} />
      {community && community.length === 0 && <Examples />}

      {teaching.map((g) => <TeacherIdeas key={g.id} group={g} />)}
      {isMod && <ModeratorIdeas />}
      <p className="tag">Ideas appear right away. If something isn’t okay, tap Report: after a few reports an idea is hidden until a teacher or moderator looks.</p>
    </div>
  );
}

function IdeaList({ title, ideas, mine, empty }: { title: string; ideas: CloudIdea[] | null; mine: Set<string>; empty: string | null }) {
  if (!ideas) return null;
  return (
    <section className="list" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      {ideas.length === 0 && empty && <p className="note">{empty}</p>}
      {ideas.map((it) => <IdeaCard key={it.path} it={it} mine={mine.has(it.path)} />)}
    </section>
  );
}

function IdeaCard({ it, mine = false, adult = false }: { it: CloudIdea; mine?: boolean; adult?: boolean }) {
  const { state, dispatch } = useGame();
  const voted = state.votedIdeaIds.includes(it.path);
  const [reported, setReported] = useState(false);
  const [busy, setBusy] = useState(false);
  const prob = PROBLEMS.find((p) => p.id === it.problemId);
  const vote = async () => {
    setBusy(true);
    dispatch({ type: 'idea/vote', id: it.path });
    try { await setVote(it.path, !voted); } catch { dispatch({ type: 'idea/vote', id: it.path }); } finally { setBusy(false); }
  };
  const report = async () => {
    if (!window.confirm('Report this idea to a teacher or moderator?')) return;
    try { await reportIdea(it); } catch { /* already reported */ }
    setReported(true);
  };
  return (
    <article className={`glass idea ${it.status === 'hidden' ? 'is-hidden' : ''}`}>
      <div className="grow">
        <div className="row-start">
          {mine && <span className="tag-pill green">YOUR IDEA</span>}
          {it.status === 'hidden' && <span className="tag-pill">HIDDEN{it.reports ? ` · ${it.reports} REPORTS` : ''}</span>}
          {prob && <span className="label">{prob.title}</span>}
        </div>
        <div className="idea-title">{it.title}</div>
        {it.problem && <p><b className="k-problem">Problem</b> {it.problem}</p>}
        <p><b className="k-idea">Idea</b> {it.idea}</p>
        {it.evidence && <p><b className="k-evidence">Evidence</b> {it.evidence}</p>}
        <div className="row-start idea-actions">
          {adult ? (
            <>
              <button className="btn ghost small" onClick={() => setHidden(it.path, it.status !== 'hidden')}>{it.status === 'hidden' ? 'Show again' : 'Hide'}</button>
              <button className="btn ghost small" onClick={() => { if (window.confirm('Delete this idea for good?')) deleteIdea(it.path); }}>Delete</button>
            </>
          ) : mine ? (
            <button className="link-btn" onClick={() => { if (window.confirm('Delete your idea?')) deleteIdea(it.path); }}>Delete</button>
          ) : (
            <button className="link-btn" onClick={report} disabled={reported}>{reported ? 'Reported. Thank you' : 'Report'}</button>
          )}
        </div>
      </div>
      {!adult && (
        <button className={`vote ${voted ? 'on' : ''}`} aria-pressed={voted} disabled={busy || it.status !== 'visible'} aria-label={`${voted ? 'Remove vote for' : 'Vote for'} ${it.title}`} onClick={vote}>
          <Icon name="up" size={18} /><span>{it.votes}</span>
        </button>
      )}
    </article>
  );
}

function TeacherIdeas({ group: g }: { group: OwnedGroup }) {
  const shown = useIdeas(g.id, { field: 'status', value: 'visible' });
  const hidden = useIdeas(g.id, { field: 'status', value: 'hidden' });
  const all = [...(hidden ?? []), ...(shown ?? [])];
  return (
    <section className="list teacher-ideas" aria-label={`Ideas in ${g.name}`}>
      <h2 className="section-title">Ideas in {g.name} <span className="label violet">You’re the teacher</span></h2>
      {all.length === 0 && <p className="note">No ideas yet. They appear here as soon as students share them.</p>}
      {all.map((it) => <IdeaCard key={it.path} it={it} adult />)}
    </section>
  );
}

function ModeratorIdeas() {
  const hidden = useIdeas(null, { field: 'status', value: 'hidden' });
  return (
    <section className="list teacher-ideas" aria-label="Hidden community ideas">
      <h2 className="section-title">Hidden community ideas <span className="label violet">Moderator</span></h2>
      {hidden && hidden.length === 0 && <p className="note">Nothing to look at. All community ideas are visible.</p>}
      {hidden?.map((it) => <IdeaCard key={it.path} it={it} adult />)}
    </section>
  );
}

function Examples() {
  return (
    <section className="list" aria-label="Example ideas">
      <p className="note">No community ideas yet this week. Here are examples to spark yours:</p>
      {EXAMPLE_IDEAS.map((it) => (
        <article key={it.id} className="glass idea">
          <div className="grow">
            <div className="row-start"><span className="tag-pill">EXAMPLE</span></div>
            <div className="idea-title">{it.title}</div>
            {it.problem && <p><b className="k-problem">Problem</b> {it.problem}</p>}
            <p><b className="k-idea">Idea</b> {it.idea}</p>
            {it.evidence && <p><b className="k-evidence">Evidence</b> {it.evidence}</p>}
          </div>
        </article>
      ))}
    </section>
  );
}
