import React, { useRef, useState } from 'react';
import { SPECIMENS, specimenById } from '../data/specimens';
import SpecimenCard from '../components/SpecimenCard';
import { Icon } from '../components/ui';
import { identifyPlastic, ScannerNotConfigured, scannerEndpoint } from '../services/scanner';

export default function Scan({ initialId, onToLab }: { initialId?: string | null; onToLab: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'error'>('idle');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setStatus('scanning');
    setNote('');
    try {
      const r = await identifyPlastic(file);
      if (r.specimenId) { setSelected(r.specimenId); setStatus('idle'); setNote(`Match: ${r.label} (${Math.round(r.confidence * 100)}%)`); }
      else { setStatus('error'); setNote(`Looks like "${r.label}", which isn't in our specimen files yet. Pick the closest one below.`); }
    } catch (err) {
      setStatus('error');
      setNote(err instanceof ScannerNotConfigured ? 'The AI scanner connects in the next update. For now, pick what you found below.' : 'The scan didn’t go through. Check your connection, or pick what you found below.');
    }
  };

  const idx = selected ? SPECIMENS.findIndex((s) => s.id === selected) : -1;

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="label accent">Observe → Investigate</div>
        <h1>Scan a plastic</h1>
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
      {!scannerEndpoint && !note && <p className="note">AI identification arrives in the next update. You can already open any Specimen File below.</p>}

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
