import React, { useCallback, useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { CodeNotFound, GROUP_TARGET, createGroup, joinGroup, joinLink, leaveGroup, myGroups, normalizeCode, useGroupWeek, type OwnedGroup } from '../services/groups';
import { hasContactDetails } from '../services/feedback';
import type { GroupRef } from '../types';

const mass = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${Math.round(g)} g`);

/**
 * Classes for schools. Students join with a code (no account, no name). Teachers sign in with Google
 * to create a class and see how many joined and the class total, never who did what.
 */
export default function ClassCard({ isTeacher, initialCode }: { isTeacher: boolean; initialCode: string }) {
  const { state, dispatch } = useGame();
  const group = state.group;
  return (
    <div className="account class-card">
      {group ? <MyClass group={group} onLeave={async () => { await leaveGroup(group.id); dispatch({ type: 'group', group: null }); }} /> : <Join initialCode={initialCode} />}
      {isTeacher ? <Teach /> : !group && <p className="tag">Teachers: sign in with Google above to create a class.</p>}
    </div>
  );
}

function MyClass({ group, onLeave }: { group: GroupRef; onLeave: () => void }) {
  const grams = useGroupWeek(group.id);
  const target = GROUP_TARGET[group.kind];
  const pct = grams == null ? 0 : Math.min(100, Math.round((grams / target) * 100));
  return (
    <div className="grow">
      <div className="row"><span className="label accent">Your class</span><span className="tag">Code {group.code}</span></div>
      <div className="title">{group.name}</div>
      <div className="bar thick"><i className="tone-good" style={{ width: `${pct}%` }} /></div>
      <div className="row">
        <span className="label green">{grams == null ? 'Connecting…' : `${mass(grams)} of ${mass(target)} this week`}</span>
        <button className="btn ghost small" onClick={onLeave}>Leave class</button>
      </div>
      <p className="tag">Your refused plastic counts for your class and the world at the same time.</p>
    </div>
  );
}

function Join({ initialCode }: { initialCode: string }) {
  const { dispatch } = useGame();
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { dispatch({ type: 'group', group: await joinGroup(code) }); } catch (err) {
      setError(err instanceof CodeNotFound ? 'We couldn’t find that code. Check it with your teacher.' : 'Couldn’t join right now. Check your connection.');
    } finally { setBusy(false); }
  };
  return (
    <form className="grow class-join" onSubmit={join}>
      <label className="label" htmlFor="class-code">Join your class</label>
      <div className="row tight">
        <input id="class-code" className="code-input" value={code} onChange={(e) => setCode(normalizeCode(e.target.value))} placeholder="CODE" autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" aria-describedby="class-code-help" />
        <button className="btn primary small" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Joining…' : 'Join'}</button>
      </div>
      <p className="tag" id="class-code-help">Ask your teacher for the 6-letter code. You don’t need an account or your name.</p>
      {error && <p className="note warn-text" role="alert">{error}</p>}
    </form>
  );
}

function Teach() {
  const [groups, setGroups] = useState<OwnedGroup[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const load = useCallback(() => { myGroups().then(setGroups).catch(() => setGroups([])); }, []);
  useEffect(load, [load]);

  const bad = name.trim().length > 0 && (name.trim().length < 2 || hasContactDetails(name));
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await createGroup(name, 'class'); setName(''); setOpen(false); load(); } catch { setError('Couldn’t create the class. Try again.'); } finally { setBusy(false); }
  };
  const copy = async (g: OwnedGroup) => {
    try { await navigator.clipboard.writeText(joinLink(g.code)); setCopied(g.id); window.setTimeout(() => setCopied(''), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="teach">
      <div className="row"><span className="label violet">Teaching</span>{!open && <button className="btn ghost small" onClick={() => setOpen(true)}>+ Create a class</button>}</div>
      {open && (
        <form className="class-join" onSubmit={create}>
          <label className="label" htmlFor="class-name">Class name</label>
          <input id="class-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Room 12 Science" />
          {bad && <p className="note warn-text" role="alert">Use 2–40 characters, without emails, phone numbers or links.</p>}
          {error && <p className="note warn-text" role="alert">{error}</p>}
          <div className="row">
            <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary small" disabled={busy || bad || name.trim().length < 2}>{busy ? 'Creating…' : 'Create class'}</button>
          </div>
        </form>
      )}
      {groups?.map((g) => (
        <div key={g.id} className="owned">
          <div className="row"><span className="title">{g.name}</span><span className="code-big">{g.code}</span></div>
          <div className="row">
            <span className="label">{g.members} {g.members === 1 ? 'student' : 'students'} · {mass(g.grams)} of {mass(GROUP_TARGET[g.kind])} this week</span>
            <button className="btn ghost small" onClick={() => copy(g)}>{copied === g.id ? 'Link copied' : 'Copy join link'}</button>
          </div>
        </div>
      ))}
      {groups && groups.length === 0 && !open && <p className="tag">Create a class and share its code. Students join without accounts or names; you see the class total, not individuals.</p>}
    </div>
  );
}
