import React, { useState } from 'react';
import type { Specimen } from '../types';

/** Field-notebook "Specimen File" for one plastic. Every figure is sourced. */
export default function SpecimenCard({ s, number }: { s: Specimen; number: number }) {
  const [showSources, setShowSources] = useState(false);
  return (
    <article className="specimen" aria-label={`Specimen file: ${s.name}`}>
      <div className="sp-head">
        <span>SPECIMEN Nº {String(number).padStart(3, '0')}</span>
        <span>THREAT · {s.threat.toUpperCase()}</span>
      </div>
      <h2 className="sp-title">{s.name}</h2>
      <div className="sp-polymer">{s.polymer}</div>
      <div className="sp-scribble sp-resin">resin code {s.resinCode}</div>

      <div className="sp-stats">
        <div><div className="sp-k">MASS</div><div className="sp-v">{s.massLabel}</div></div>
        <div><div className="sp-k">PERSISTS</div><div className="sp-v">{s.persistence}</div></div>
        <div><div className="sp-k">ALL PLASTIC RECYCLED</div><div className="sp-v">~9% worldwide</div></div>
      </div>

      <p><b>Field notes.</b> {s.fieldNotes}</p>
      <p><b>Frontier science.</b> {s.frontierScience}</p>
      <div className="sp-scribble sp-note">Open question: {s.openQuestion}</div>

      {showSources && (
        <ul className="sp-sources">
          {s.sources.map((src) => (
            <li key={src.label}>{src.url ? <a href={src.url} target="_blank" rel="noreferrer">{src.label}</a> : src.label}</li>
          ))}
        </ul>
      )}
      <button className="sp-toggle" onClick={() => setShowSources((v) => !v)}>
        {showSources ? 'Hide sources' : 'How we know this → sources'}
      </button>
    </article>
  );
}
