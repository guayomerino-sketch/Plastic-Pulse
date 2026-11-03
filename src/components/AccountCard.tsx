import React, { useState } from 'react';
import type { useAccount } from '../services/account';

type AccountApi = ReturnType<typeof useAccount>;

/** Optional Google sign-in: guests keep playing; signing in saves progress on every device. */
export default function AccountCard({ a }: { a: AccountApi }) {
  const [busy, setBusy] = useState(false);
  const run = (f: () => Promise<void>) => async () => { setBusy(true); try { await f(); } finally { setBusy(false); } };
  if (!a.account) return null;
  return (
    <div className="account">
      {a.account.kind === 'google' ? (
        <>
          <div className="grow">
            <div className="label accent">Signed in with Google</div>
            <p className="note">{a.syncing ? 'Loading your saved progress…' : `${a.account.name ? `Hi ${a.account.name}! ` : ''}Your progress is saved to your account on every device.`}</p>
          </div>
          <button className="btn ghost small" onClick={run(a.signOut)} disabled={busy}>Sign out</button>
        </>
      ) : (
        <>
          <div className="grow">
            <div className="label">Playing as a guest</div>
            <p className="note">Your progress is saved on this device only. Sign in to keep it on every device.</p>
          </div>
          <button className="btn primary small" onClick={run(a.signIn)} disabled={busy}>{busy ? 'Opening…' : 'Sign in with Google'}</button>
        </>
      )}
      {a.error && <p className="note warn-text" role="alert">{a.error}</p>}
      <p className="tag">Optional. Google is used only to save your progress. Your name and email are never shown to other players or stored in the game.</p>
    </div>
  );
}
