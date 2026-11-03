import React, { useState } from 'react';
import AccountCard from '../components/AccountCard';
import ClassCard from '../components/ClassCard';
import ShareButton from '../components/ShareButton';
import { rankFor, useGame } from '../game/store';
import type { useAccount } from '../services/account';
import { deleteMyData, NeedsFreshSignIn } from '../services/deleteData';

/** The player's own page: sign-in, class (join or teach), sharing and feedback. */
export default function You({ account, classCode, onFeedback }: { account: ReturnType<typeof useAccount>; classCode: string; onFeedback: () => void }) {
  const { state } = useGame();
  const rank = rankFor(state);
  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label accent">Your field station</div>
        <h1>{rank.current.name} · {state.xp.toLocaleString()} XP</h1>
      </header>
      <section className="glass panel" aria-label="Account">
        <AccountCard a={account} />
      </section>
      <section className="glass panel" aria-label="Class">
        <ClassCard isTeacher={account.account?.kind === 'google'} initialCode={classCode} />
      </section>
      <section className="glass panel" aria-label="Share and feedback">
        <div className="label">Share your progress</div>
        <p className="note">An image of your field report for WhatsApp, Instagram or anywhere else. It never shows your name or class.</p>
        <ShareButton label="Share my field report" />
        <button className="btn ghost" onClick={onFeedback}>Tell us what you think</button>
      </section>
      <PrivacyPanel groupId={state.group?.id ?? null} />
    </div>
  );
}

function PrivacyPanel({ groupId }: { groupId: string | null }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const erase = async () => {
    if (!window.confirm('Delete everything Plastic Pulse keeps about you? Your progress, ideas and class membership are erased for good.')) return;
    setBusy(true); setMsg('');
    try {
      await Promise.race([deleteMyData(groupId), new Promise((_, fail) => setTimeout(() => fail(new Error('timeout')), 20_000))]);
      location.replace('/');
    } catch (err) {
      setMsg(err instanceof NeedsFreshSignIn ? 'For safety, sign out, sign in with Google again, then tap Delete my data.' : 'Couldn’t delete right now. Check your connection and try again.');
      setBusy(false);
    }
  };
  return (
    <section className="glass panel" aria-label="Privacy">
      <div className="label">Your privacy</div>
      <p className="note">What we keep, what we don’t, in plain words.</p>
      <a className="btn ghost" href="/privacy.html" target="_blank" rel="noopener">Read the privacy page</a>
      <button className="btn ghost" onClick={erase} disabled={busy}>{busy ? 'Deleting…' : 'Delete my data'}</button>
      {msg && <p className="note warn-text" role="alert">{msg}</p>}
    </section>
  );
}
