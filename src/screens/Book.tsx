import React, { useState } from 'react';
import { SETS, SPECIMENS, specimenById } from '../data/specimens';
import SpecimenCard from '../components/SpecimenCard';
import { isFound, useGame } from '../game/store';
import FieldFindCard from '../components/FieldFindCard';
import { MATERIALS, type MaterialId } from '../data/materials';

/**
 * The Specimen Book: every plastic a player has logged or studied, as a collection in sets.
 * Undiscovered specimens stay locked, showing only their rarity, so there is always something left to find.
 * New specimens are added only once their facts are sourced (see specimens.ts).
 */
export default function Book({ initialId, onScan, onPitch }: { initialId?: string | null; onScan: () => void; onPitch: (label: string) => void }) {
  const { state } = useGame();
  const found = (id: string) => isFound(state, id);
  const discovered = SPECIMENS.filter((s) => found(s.id));
  const [selected, setSelected] = useState<string | null>(initialId ?? discovered[0]?.id ?? null);
  const [hint, setHint] = useState('');
  const [openFind, setOpenFind] = useState<string | null>(null);
  const shownFind = state.finds.find((f) => f.slug === openFind);

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

      {selected && found(selected) && <SpecimenCard key={selected} s={specimenById(selected)} number={SPECIMENS.findIndex((s) => s.id === selected) + 1} />}

      {SETS.map((set) => {
        const items = SPECIMENS.filter((s) => s.set === set.id);
        const have = items.filter((s) => found(s.id)).length;
        const complete = have === items.length;
        return (
          <section key={set.id} className="book-set" aria-label={`${set.name}: ${have} of ${items.length}`}>
            <div className="row">
              <h2 className="section-title">{set.name}</h2>
              <span className={`label ${complete ? 'accent' : ''}`}>{complete ? 'Set complete' : `${have}/${items.length}`}</span>
            </div>
            <div className="book-grid">
              {items.map((s) => {
                const n = String(SPECIMENS.indexOf(s) + 1).padStart(2, '0');
                const r = s.rarity.toLowerCase();
                return found(s.id) ? (
                  <button key={s.id} className={`book-tile r-${r} ${s.id === selected ? 'on' : ''}`} aria-pressed={s.id === selected}
                    onClick={() => { setSelected(s.id); setHint(''); window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}>
                    <small>{n} · {s.rarity}</small>{s.short}
                  </button>
                ) : (
                  <button key={s.id} className={`book-tile locked r-${r}`} aria-label={`Locked ${s.rarity.toLowerCase()} specimen`}
                    onClick={() => setHint(s.rarity === 'Hidden'
                      ? 'A hidden plastic: something most people don’t know is plastic. Log it on Pulse or study it in Scan to unlock it.'
                      : s.rarity === 'Rare' ? 'A rare specimen. Look for it in Scan.' : 'Log it on Pulse or study it in Scan to unlock it.')}>
                    <small>{n} · {s.rarity}</small>Locked
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {hint && <p className="note" role="status">{hint}</p>}

      <section className="book-set" aria-label="Field finds">
        <div className="row">
          <h2 className="section-title">Field finds</h2>
          <span className="label accent">{state.finds.length} identified</span>
        </div>
        {state.finds.length === 0 && <p className="note">Scan anything around you, like a milk carton, a toy or a phone case. Every new thing you identify lands here.</p>}
        {shownFind && <FieldFindCard key={shownFind.slug} find={shownFind} onPitch={onPitch} />}
        <div className="finds">
          {state.finds.map((f) => (
            <button key={f.slug} className={`find-chip ${f.slug === openFind ? 'on' : ''}`} onClick={() => setOpenFind(f.slug === openFind ? null : f.slug)}>
              <small>{MATERIALS[(f.material as MaterialId) in MATERIALS ? (f.material as MaterialId) : 'UNKNOWN'].code}</small>{f.label}
            </button>
          ))}
        </div>
      </section>
      <p className="tag">More specimens are on the way. Each one joins the book once its facts are checked against a source.</p>

      <button className="btn ghost-violet" onClick={onScan}>Find more in Scan →</button>
    </div>
  );
}
