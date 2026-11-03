import React, { useState } from 'react';
import { useGame } from '../game/store';
import { progressCard, shareImage, specimenCard } from '../services/shareCard';

/** Makes a share card and opens the phone's share sheet (or downloads it on a computer). */
export default function ShareButton({ specimenId, label = 'Share' }: { specimenId?: string; label?: string }) {
  const { state } = useGame();
  const [status, setStatus] = useState<'idle' | 'making' | 'downloaded' | 'error'>('idle');
  const share = async () => {
    setStatus('making');
    try {
      const blob = specimenId ? await specimenCard(specimenId) : await progressCard(state);
      const how = await shareImage(blob, specimenId ? `plastic-pulse-${specimenId}` : 'plastic-pulse-field-report',
        specimenId ? 'I found a new plastic specimen in Plastic Pulse.' : 'My Plastic Pulse field report.');
      setStatus(how === 'downloaded' ? 'downloaded' : 'idle');
    } catch { setStatus('error'); }
  };
  return (
    <>
      <button className="btn ghost-violet share-btn" onClick={share} disabled={status === 'making'}>
        {status === 'making' ? 'Making your card…' : label}
      </button>
      {status === 'downloaded' && <p className="tag" role="status">Image saved. Post it anywhere you like.</p>}
      {status === 'error' && <p className="note warn-text" role="alert">Couldn’t make the image. Try again.</p>}
    </>
  );
}
