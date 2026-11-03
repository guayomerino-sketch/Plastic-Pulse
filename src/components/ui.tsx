import React from 'react';
import { healthLabel } from '../game/store';

const paths: Record<string, React.ReactNode> = {
  pulse: <><circle cx="12" cy="12" r="9" /><path d="M3 12h4l2-4 4 8 2-4h6" /></>,
  scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></>,
  lab: <><path d="M9 3h6" /><path d="M10 9V3" /><path d="M14 9V3" /><path d="M10 9 4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9" /></>,
  bulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /><path d="M9 8h6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /><path d="M12 3a14 14 0 0 0 0 18" /></>,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
  up: <path d="m18 15-6-6-6 6" />,
  back: <path d="m15 18-6-6 6-6" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
};

export function Icon({ name, size = 22 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function HealthMeter({ health, label = 'My biome' }: { health: number; label?: string }) {
  const pct = Math.round(health * 100);
  const tone = health > 0.5 ? 'good' : health > 0.3 ? 'warn' : 'bad';
  const lit = health * 10;
  return (
    <div className="glass meter" role="meter" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`meter-elbow tone-${tone}`}>{label}</div>
      <div className={`meter-body tone-${tone}`}>
        <div className="row">
          <span className="label">Health</span>
          <span className="health-num">{pct}% · {healthLabel(health)}</span>
        </div>
        <div className="segments" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => <i key={i} className={i + 1 <= lit ? 'on' : i < lit ? 'half' : ''} />)}
        </div>
      </div>
    </div>
  );
}
