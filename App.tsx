import React, { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import { getPlasticAnalysis } from './services/geminiService';

export default function App() {
  const globeRef = useRef<any>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Safety: only touch controls if the ref exists
    if (!globeRef.current) return;
    try {
      const controls = globeRef.current.controls && globeRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
      }
    } catch (e) {
      // Swallow any errors - avoid crashing the app
    }
  }, []);

  async function handleTestAi() {
    setError(null);
    setAiAnswer(null);
    setLoading(true);
    try {
      const resp = await getPlasticAnalysis('Why is plastic bad?');
      setAiAnswer(resp);
    } catch (e: any) {
      setError('Failed to get AI response');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      {/* Globe as full-screen background (zIndex 1) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <Globe
          ref={globeRef}
          globeImageUrl={'/textures/earth-day.jpg'}
          bumpImageUrl={'/textures/earth-topology.png'}
          backgroundImageUrl={'/textures/night-sky.png'}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* Glassmorphism overlay (zIndex 10) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
            {/* Title (top-left) */}
            <div style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: 1.5, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
              PLASTIC PULSE
            </div>

            {/* Top-right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleTestAi}
                  style={{
                    pointerEvents: 'auto',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    backdropFilter: 'blur(6px)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {loading ? 'Thinking…' : 'Test AI'}
                </button>

                {/* Floating result card (top-right) */}
                {(!loading && (aiAnswer || error)) && (
                  <div style={{ position: 'absolute', right: 0, top: 48, width: 360, background: 'rgba(255,255,255,0.9)', color: '#000', padding: 14, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>AI Result</div>
                    {error && <div style={{ color: 'crimson' }}>{error}</div>}
                    {aiAnswer && <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{aiAnswer}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom navigation (bottom-center) */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))', padding: 8, borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
              <button style={{ pointerEvents: 'auto', background: 'transparent', color: 'white', padding: '8px 14px', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Globe</button>
              <button style={{ pointerEvents: 'auto', background: 'transparent', color: 'white', padding: '8px 14px', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Tracker</button>
              <button style={{ pointerEvents: 'auto', background: 'transparent', color: 'white', padding: '8px 14px', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Leaderboard</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
