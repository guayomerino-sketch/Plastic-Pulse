import React, { useEffect, useRef, useState } from 'react';
import { SPECIMENS, specimenById } from '../data/specimens';
import SpecimenCard from '../components/SpecimenCard';
import { Icon } from '../components/ui';
import { useGame } from '../game/store';
import { identifyPlastic, ScannerBusy, ScannerNoObject, ScannerNotConfigured, slugify, tallyUnmatched } from '../services/scanner';
import FieldFindCard from '../components/FieldFindCard';
import { XP } from '../data/content';

export default function Scan({ initialId, onToLab, onPitch }: { initialId?: string | null; onToLab: () => void; onPitch: (label: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'error'>('idle');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const { state, dispatch } = useGame();
  const [findSlug, setFindSlug] = useState<string | null>(null);
  const find = findSlug ? state.finds.find((f) => f.slug === findSlug) ?? null : null;

  // Opening a specimen file adds it to the Specimen Book.
  useEffect(() => { if (selected) dispatch({ type: 'study', specimenId: selected }); }, [selected, dispatch]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStatus('scanning');
    setNote('');
    try {
      const r = await identifyPlastic(file);
      setStatus('idle');
      if (r.specimenId) { setFindSlug(null); setSelected(r.specimenId); setNote(`Match: ${r.label} (${Math.round(r.confidence * 100)}%)`); }
      else {
        // Anything else becomes a Field find: named by the AI, explained with our sourced material facts.
        const slug = slugify(r.label);
        const isNew = !state.finds.some((f) => f.slug === slug);
        dispatch({ type: 'find/add', find: { slug, label: r.label, material: r.material, plastic: r.plastic, parts: r.parts } });
        setSelected(null); setFindSlug(slug);
        setNote(isNew ? `New field find: ${r.label}! +${XP.find} XP` : `Field find: ${r.label}`);
        if (r.plastic !== 'no') tallyUnmatched(r.label, r.material).catch(() => {});
      }
    } catch (err) {
      setStatus('error');
      setNote(err instanceof ScannerNotConfigured ? 'The AI scanner isn’t switched on yet. For now, pick what you found below.'
        : err instanceof ScannerBusy ? 'The scanner is resting for now (it has a limit). Pick what you found below, or try again later.'
        : err instanceof ScannerNoObject ? 'No object found in that photo. Try again with just the item, up close.'
        : 'The scan didn’t go through. Check your connection, or pick what you found below.');
    }
  };

  const idx = selected ? SPECIMENS.findIndex((s) => s.id === selected) : -1;

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label accent">Observe → Investigate</div>
        <h1>Scan anything</h1>
      </header>

      <section className="visor" aria-label="Scanner">
        {preview ? <img src={preview} alt="Your photo" /> : <Icon name="camera" size={40} />}
        {status === 'scanning' && <div className="laser" />}
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      </section>
      <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={status === 'scanning'}>
        <Icon name="camera" size={18} /> {status === 'scanning' ? 'Scanning…' : 'Take or upload a photo'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      {note && <p className="note" role="status">{note}</p>}
      {!note && <p className="note">Scan anything: a carton, a toy, a phone case. Photograph only the item, with no people in the picture. The photo goes to Anthropic’s Claude AI to recognise it and is never stored. Facts come from our sourced files, not the AI.</p>}

      {find && <FieldFindCard find={find} onPitch={onPitch} />}

      {selected && idx >= 0 && (
        <>
          <SpecimenCard s={specimenById(selected)} number={idx + 1} />
          <button className="btn ghost-violet" onClick={onToLab}>Take the open question to the Lab →</button>
        </>
      )}

      <h2 className="section-title">Specimen files</h2>
      <div className="grid-specimens">
        {SPECIMENS.map((s, i) => (
          <button key={s.id} className={`glass spec-tile ${s.id === selected ? 'on' : ''}`} onClick={() => { setSelected(s.id); window.scrollTo?.(0, 0); }}>
            <span className="label">Nº {String(i + 1).padStart(3, '0')} · {s.resinCode}</span>
            <span className="spec-name">{s.name}</span>
            <span className={`threat t-${s.threat.toLowerCase()}`}>{s.threat}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
