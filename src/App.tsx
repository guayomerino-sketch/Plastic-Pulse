import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChoiceAction, ScreenId } from './types';
import { useGame, rankFor } from './game/store';
import { World3D, isWebGLAvailable } from './world/World3D';
import { Music } from './audio/music';
import { GOODALL_QUOTE, HOPEFUL_LINES, PRIVACY_NOTE, SONG, SORROW_LINES, currentProblem } from './data/content';
import { HealthMeter, Icon } from './components/ui';
import { DISCOVERY_XP, specimenById } from './data/specimens';
import { contribute } from './services/sharedGoal';
import Pulse from './screens/Pulse';
import Scan from './screens/Scan';
import Lab from './screens/Lab';
import Solutions from './screens/Solutions';
import World from './screens/World';
import Feedback from './screens/Feedback';
import Book from './screens/Book';

const NAV: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'pulse', label: 'Pulse', icon: 'pulse' },
  { id: 'scan', label: 'Scan', icon: 'scan' },
  { id: 'book', label: 'Book', icon: 'book' },
  { id: 'lab', label: 'Lab', icon: 'lab' },
  { id: 'world', label: 'World', icon: 'globe' },
];

export default function App() {
  const { state, dispatch } = useGame();
  const [entered, setEntered] = useState(false);
  const [screen, setScreen] = useState<ScreenId>('pulse');
  const [scanId, setScanId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [lyric, setLyric] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World3D | null>(null);
  const musicRef = useRef<Music | null>(null);
  const lyricTimer = useRef<number>();
  const lastSorrow = useRef(0);
  const refusals = useRef(0);
  const webgl = useMemo(isWebGLAvailable, []);
  // Budget phones keep the look but skip live blur behind the glass.
  const lite = useMemo(() => {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    return (navigator.hardwareConcurrency || 8) <= 4 || (/Android/i.test(navigator.userAgent) && mem <= 4);
  }, []);
  const rank = rankFor(state);
  const sceneScreen = screen === 'pulse' || screen === 'world';

  // Create the 3D world once.
  useEffect(() => {
    if (!webgl || !hostRef.current) return;
    const low = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const w = new World3D(hostRef.current, { lowQuality: low, reduceMotion });
    worldRef.current = w;
    w.setHealth(state.health);
    return () => { w.dispose(); worldRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl]);

  useEffect(() => {
    worldRef.current?.setHealth(state.health);
    musicRef.current?.setHealth(state.health);
  }, [state.health]);

  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    w.setView(screen === 'world' ? 'earth' : 'biome');
    w.setPaused(!sceneScreen); // save battery while reading
  }, [screen, sceneScreen]);

  const showLyric = useCallback((text: string) => {
    setLyric(text);
    window.clearTimeout(lyricTimer.current);
    lyricTimer.current = window.setTimeout(() => setLyric(null), 4200);
  }, []);

  const startMusic = useCallback(() => {
    if (!musicRef.current) musicRef.current = new Music();
    musicRef.current.setHealth(state.health);
    musicRef.current.start().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
  }, [state.health]);

  const toggleMusic = () => {
    if (musicPlaying) { musicRef.current?.pause(); setMusicPlaying(false); dispatch({ type: 'music', on: false }); }
    else { startMusic(); dispatch({ type: 'music', on: true }); }
  };

  const enter = () => {
    setEntered(true);
    if (state.musicOn) startMusic();
    worldRef.current?.purify(1);
    window.setTimeout(() => showLyric(HOPEFUL_LINES[0]), 3500);
  };

  const onChoice = (specimenId: string, action: ChoiceAction) => {
    dispatch({ type: 'log', specimenId, action });
    if (action !== 'use') contribute(specimenById(specimenId).massGrams ?? 0).catch(() => { /* offline: the choice still counts locally */ });
    const w = worldRef.current;
    if (action === 'use') {
      w?.pollute();
      if (state.health - 0.06 < 0.56 && Date.now() - lastSorrow.current > 12000) {
        lastSorrow.current = Date.now();
        showLyric(SORROW_LINES[Math.floor(Math.random() * SORROW_LINES.length)]);
      }
    } else {
      w?.purify(action === 'refuse' ? 1 : 0.6);
      if (action === 'refuse') {
        refusals.current++;
        if (refusals.current % 3 === 0) showLyric(HOPEFUL_LINES[(refusals.current / 3) % HOPEFUL_LINES.length]);
      }
    }
  };

  const go = (id: ScreenId) => { setScreen(id); window.scrollTo?.(0, 0); };

  // First discovery: show the reveal for a few seconds.
  const found = state.discovery ? specimenById(state.discovery.specimenId) : null;
  useEffect(() => {
    if (!state.discovery) return;
    const t = window.setTimeout(() => dispatch({ type: 'discovery/clear' }), 5000);
    return () => window.clearTimeout(t);
  }, [state.discovery, dispatch]);
  const openDiscovery = () => {
    if (!found) return;
    setBookId(found.id); dispatch({ type: 'discovery/clear' }); go('book');
  };

  return (
    <div className={`app ${sceneScreen ? 'scene' : 'reading'}${lite ? ' lite' : ''}${entered ? '' : ' entering'}`}>
      <div className="world" ref={hostRef} aria-hidden="true">{!webgl && <div className="world-fallback" />}</div>
      <div className="veil" />

      <header className="topbar">
        <div className="row">
          <div className="mark">PLASTIC<span> PULSE</span></div>
          <div className="row tight">
            <span className="xp-pill" title={rank.current.name}>{state.xp.toLocaleString()} XP</span>
            {state.streakDays > 0 && <span className="xp-pill amber" aria-label={`${state.streakDays}-day streak`}><Icon name="flame" size={13} /> {state.streakDays}</span>}
            <button className={`iconbtn ${musicPlaying ? 'on' : ''}`} aria-pressed={musicPlaying} aria-label={musicPlaying ? 'Pause music' : `Play music: ${SONG.title}`} onClick={toggleMusic}>
              <Icon name="music" size={20} />
            </button>
          </div>
        </div>
        {sceneScreen && <HealthMeter health={state.health} label={screen === 'world' ? 'On Earth' : rank.current.name} />}
      </header>

      <main className="content">
        {screen === 'pulse' && <Pulse onChoice={onChoice} onOpenProblem={() => go('solutions')} />}
        {screen === 'scan' && <Scan initialId={scanId ?? currentProblem().specimenId} onToLab={() => go('lab')} />}
        {screen === 'lab' && <Lab />}
        {screen === 'solutions' && <Solutions />}
        {screen === 'world' && <World onFeedback={() => go('feedback')} />}
        {screen === 'feedback' && <Feedback onDone={() => go('world')} />}
        {screen === 'book' && <Book key={bookId ?? 'book'} initialId={bookId} onScan={() => { setScanId(null); go('scan'); }} />}
      </main>

      <nav className="nav glass" aria-label="Main">
        {NAV.map((n) => (
          <button key={n.id} className={screen === n.id ? `on${n.id === 'book' ? ' violet' : ''}` : ''} aria-current={screen === n.id ? 'page' : undefined} onClick={() => { if (n.id === 'scan') setScanId(null); if (n.id === 'book') setBookId(null); go(n.id); }}>
            <Icon name={n.icon} />{n.label}
          </button>
        ))}
      </nav>

      {found && entered && (
        <div className={`glass reveal r-${found.rarity.toLowerCase()}`} role="status">
          <div className="reveal-orb" aria-hidden="true"><Icon name="book" size={24} /></div>
          <div className="grow">
            <div className="label">New specimen · {found.rarity === 'Hidden' ? 'hidden plastic' : found.rarity} · +{DISCOVERY_XP[found.rarity]} XP</div>
            <div className="reveal-name">{found.name}</div>
          </div>
          <button className="btn primary" onClick={openDiscovery}>Open</button>
        </div>
      )}

      <p className={`lyric ${lyric ? 'show' : ''}`} aria-live="polite">
        {lyric}{lyric && <small>{SONG.title} · {SONG.credit}</small>}
      </p>

      {!entered && (
        <div className="intro">
          <div className="intro-status" aria-hidden="true"><span>Field lab · online</span><span>PP-01</span></div>
          <div className="intro-inner">
            <div className="label accent">A field lab for the living planet</div>
            <h1>PLASTIC<span> PULSE</span></h1>
            <blockquote className="quote">“{GOODALL_QUOTE}”<cite>— Jane Goodall</cite></blockquote>
            <button className="enter" onClick={enter}>Enter the Biome <Icon name="arrow" size={18} /></button>
            <div className="credit">Sound on · instrumental · “{SONG.title}” by {SONG.credit}</div>
            <div className="credit">{PRIVACY_NOTE}</div>
          </div>
        </div>
      )}
    </div>
  );
}
