import React, { useState } from 'react';
import type { ChoiceAction } from '../types';
import { QUICK_LOG_IDS, specimenById } from '../data/specimens';
import { currentProblem, XP } from '../data/content';
import { useGame } from '../game/store';

interface Props {
  onChoice: (specimenId: string, action: ChoiceAction) => void;
  onOpenProblem: () => void;
}

const SHORT: Record<string, string> = { 'pet-bottle': 'Water bottle', 'bottle-cap': 'Bottle cap', 'grocery-bag': 'Bag', straw: 'Straw', 'foam-cup': 'Foam cup' };

const MESSAGES: Record<ChoiceAction, (name: string, g: string) => string> = {
  refuse: (n, g) => `Refused: ${n}. ${g}never made. She lifts her arms and the light rises through her.`,
  reuse: (n) => `Reused instead of a new ${n.toLowerCase()}. One less in the system.`,
  use: () => 'Logged. Plastic creeps up her dress and her leaves fall. Honest data is how scientists find patterns.',
};

export default function Pulse({ onChoice, onOpenProblem }: Props) {
  const { state } = useGame();
  const [itemId, setItemId] = useState(QUICK_LOG_IDS[0]);
  const [msg, setMsg] = useState('Tap what you just chose. Watch how the Guardian answers.');
  const problem = currentProblem();
  const item = specimenById(itemId);

  const choose = (action: ChoiceAction) => {
    onChoice(itemId, action);
    const grams = item.massGrams ? `About ${item.massGrams} g of plastic ` : '';
    setMsg(`${MESSAGES[action](item.name, grams)} +${XP[action]} XP`);
  };

  return (
    <div className="bottom-dock">
      <section className="glass panel" aria-label="Moment of choice">
        <button className="problem" onClick={onOpenProblem}>
          <b>PROBLEM OF THE WEEK</b>
          {problem.title} {problem.brief}
        </button>
        <div className="label">Moment of choice</div>
        <div className="chips" role="radiogroup" aria-label="Which plastic?">
          {QUICK_LOG_IDS.map((id) => (
            <button key={id} role="radio" aria-checked={id === itemId} className={`chip ${id === itemId ? 'on' : ''}`} onClick={() => setItemId(id)}>
              {SHORT[id] ?? specimenById(id).name}
            </button>
          ))}
        </div>
        <div className="choices">
          <button className="choice c-refuse" onClick={() => choose('refuse')}>Refused<small>+{XP.refuse} XP</small></button>
          <button className="choice c-reuse" onClick={() => choose('reuse')}>Reused<small>+{XP.reuse} XP</small></button>
          <button className="choice c-used" onClick={() => choose('use')}>Used it<small>+{XP.use} XP data</small></button>
        </div>
        <div className="msg" aria-live="polite">{msg}</div>
        {state.logs.length === 0 && <div className="tag">Your progress is saved on this device.</div>}
      </section>
    </div>
  );
}
