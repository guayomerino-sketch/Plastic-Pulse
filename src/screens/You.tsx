import React from 'react';
import AccountCard from '../components/AccountCard';
import ClassCard from '../components/ClassCard';
import ShareButton from '../components/ShareButton';
import { rankFor, useGame } from '../game/store';
import type { useAccount } from '../services/account';

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
    </div>
  );
}
