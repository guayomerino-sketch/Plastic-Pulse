import React, { useState } from 'react';
import { SPECIMENS, specimenById } from '../data/specimens';
import SpecimenCard from '../components/SpecimenCard';
import { useGame } from '../game/store';

/**
 * The Specimen Book: every plastic a player has logged or studied, as a collection.
 * Undiscovered specimens stay locked so there is always something left to find.
 * New specimens are added only once their facts are sourced (see specimens.ts).
 */
export default function Book({ onScan }: { onScan: () => void }) {
  const { state } = useGame();
  const found = new Set([...state.logs.map((l) => l.specimenId), ...state.studied]);
  const discovered = SPECIMENS.filter((s) => found.has(s.id));
  const [selected, setSelected] = useState<string | null>(discovered[0]?.id ?? null);
  const [hint, setHint] = useState('');

  return (
    <div className="screen">
      <header className="screen-head book-head">
        <div>
          <div className="label violet">Field archive</div>
          <h1>Specimen Book</h1>
        </div>
        <div className="book-count" aria-label={`${discovered.length} of ${SPECIMENS.length} discovered`}>
          {discovered.length}<span>/{SPECIMENS.length}</span>
          <div className="label book-count-label">Discovered</div>
        </div>
      </header>

      {discovered.length === 0 && (
        <p className="note">Your book is empty. Log a plastic on Pulse, or study one in Scan, and it appears here.</p>
      )}

      <div className="book-grid">
        {SPECIMENS.map((s, i) =>
          found.has(s.id) ? (
            <button key={s.id} className={`book-tile ${s.id === selected ? 'on' : ''}`} aria-pressed={s.id === selected} onClick={() => { setSelected(s.id); setHint(''); }}>
              <small>{s.resinCode} · {String(i + 1).padStart(2, '0')}</small>{s.name}
            </button>
          ) : (
            <button key={s.id} className="book-tile locked" aria-label="Undiscovered specimen" onClick={() => setHint('Undiscovered. Log it on Pulse or study it in Scan to unlock it.')}>
              <small>?? · {String(i + 1).padStart(2, '0')}</small>Locked
            </button>
          ),
        )}
      </div>
      {hint && <p className="note" role="status">{hint}</p>}
      <p className="tag">More specimens are on the way. Each one joins the book once its facts are checked against a source.</p>

      {selected && found.has(selected) && <SpecimenCard s={specimenById(selected)} number={SPECIMENS.findIndex((s) => s.id === selected) + 1} />}

      <button className="btn ghost-violet" onClick={onScan}>Find more in Scan →</button>
    </div>
  );
}
