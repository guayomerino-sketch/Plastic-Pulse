import React from 'react';
import { MATERIALS, type MaterialId } from '../data/materials';
import { XP } from '../data/content';
import { useGame } from '../game/store';
import type { ChoiceAction, FieldFind } from '../types';

const VERDICT: Record<FieldFind['plastic'], string> = { yes: 'Plastic', partly: 'Part plastic', no: 'Not plastic', unsure: 'Not sure' };

/**
 * A scanned item outside the Specimen Book. The AI named it and guessed its family; the facts below
 * come from our sourced materials table. Players can log a choice and pitch a real-life solution.
 */
export default function FieldFindCard({ find, onPitch }: { find: FieldFind; onPitch: (label: string) => void }) {
  const { dispatch } = useGame();
  const m = MATERIALS[(find.material as MaterialId) in MATERIALS ? (find.material as MaterialId) : 'UNKNOWN'];
  const log = (action: ChoiceAction) => dispatch({ type: 'find/log', slug: find.slug, action });
  const total = find.refused + find.reused + find.used;
  return (
    <article className="specimen field-find" aria-label={`Field find: ${find.label}`}>
      <div className="sp-head"><span>FIELD FIND</span><span>{VERDICT[find.plastic].toUpperCase()}</span></div>
      <h2 className="sp-title">{find.label}</h2>
      {find.parts && <p className="ai-note">AI guess: {find.parts}. Check the item to be sure.</p>}
      <div className="material">
        <div className="row"><span className="sp-resin">{m.code}</span><span className="label accent">{m.name}</span></div>
        <p><b>Often found in.</b> {m.oftenIn}</p>
        <p className="note">{m.note}</p>
      </div>
      {find.plastic !== 'no' && (
        <>
          <div className="label">What did you choose?</div>
          <div className="choices">
            <button className="choice c-refuse" onClick={() => log('refuse')}>Refused<small>+{XP.refuse} XP</small></button>
            <button className="choice c-reuse" onClick={() => log('reuse')}>Reused<small>+{XP.reuse} XP</small></button>
            <button className="choice c-used" onClick={() => log('use')}>Used it<small>+{XP.use} XP data</small></button>
          </div>
          {total > 0 && <p className="tag">You’ve logged this {total} {total === 1 ? 'time' : 'times'}: {find.refused} refused · {find.reused} reused · {find.used} used.</p>}
        </>
      )}
      <button className="btn ghost-violet" onClick={() => onPitch(find.label)}>Pitch a real-life solution for this →</button>
      {m.sources.length > 0 && <p className="tag">Material facts: {m.sources.map((s) => s.label).join(' · ')}</p>}
    </article>
  );
}
