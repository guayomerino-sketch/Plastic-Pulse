import React, { useState, useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import { getPlasticAnalysis } from './services/geminiService';

export default function App() {
  const globeRef = useRef<any>();
  
  // 1. AUDIO ENGINE (Fixed with useRef so it doesn't reset)
  const audioRef = useRef(new Audio('/anthem.mp3'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // 2. AI STATE
  const [input, setInput] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 3. POETRY SYSTEM
  const [poetryLine, setPoetryLine] = useState("Spring is a symphony and should never be silent.");
  const anthemLines = [
    "Spring is a symphony and should never be silent.",
    "Nature is too mighty for humans to tame.",
    "Dreaming Green Deals to save this ONE planet.",
    "Won’t you be a hero for this place of wonder?",
    "Money can’t build nature’s designs."
  ];

  useEffect(() => {
    // Auto-rotate the globe
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
    // Set volume
    audioRef.current.volume = 0.5;
    audioRef.current.loop = true;
  }, []);

  // Toggle Audio
  const toggleAnthem = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  // Handle AI Question
  const handleAskHero = async () => {
    if (!input) return;
    setLoading(true);
    try {
      // Pick a random poetry line for "flavor"
      setPoetryLine(anthemLines[Math.floor(Math.random() * anthemLines.length)]);
      
      // Call Gemini
      const result = await getPlasticAnalysis(input);
      setAiResponse(result);
    } catch (error) {
      setAiResponse("Signal lost. Please verify connection.");
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000', position: 'relative', overflow: 'hidden' }}>
      
      {/* --- LAYER 1: THE WORLD --- */}
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      />

      {/* --- LAYER 2: THE UI OVERLAY --- */}
      
      {/* Title */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <h1 style={{ fontFamily: 'Helvetica, sans-serif', fontWeight: 'bold', fontSize: '2rem', color: 'white', margin: 0, letterSpacing: '2px' }}>
          PLASTIC PULSE
        </h1>
      </div>

      {/* Terminal Button (Bottom Right) */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          style={{
            position: 'absolute', bottom: 30, right: 30, zIndex: 10,
            background: '#00ff41', color: 'black', border: 'none',
            padding: '12px 24px', fontFamily: 'Courier New, monospace', fontWeight: 'bold',
            fontSize: '1.2rem', cursor: 'pointer', borderRadius: '4px',
            boxShadow: '0 0 15px #00ff41'
          }}
        >
          {'>_ OPEN TERMINAL'}
        </button>
      )}

      {/* MISSION CONTROL (The Chat) */}
      {isChatOpen && (
        <div style={{
          position: 'absolute', bottom: 30, right: 30, width: '400px',
          background: 'rgba(10, 20, 10, 0.85)', backdropFilter: 'blur(10px)',
          border: '1px solid #00ff41', padding: '20px', borderRadius: '8px', zIndex: 20,
          boxShadow: '0 0 30px rgba(0, 255, 65, 0.2)', color: '#00ff41', fontFamily: 'Courier New, monospace'
        }}>
          
          {/* Header - Fixed Flex Layout */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>MISSION LOG // [EARTH_Hero]</span>
            <div>
              <button onClick={toggleAnthem} style={{ background: 'transparent', border: '1px solid #00ff41', color: isPlaying ? 'white' : '#00ff41', cursor: 'pointer', marginRight: '10px', padding: '2px 8px', fontSize: '0.8rem' }}>
                {isPlaying ? '■ STOP MUSIC' : '▶ PLAY ANTHEM'}
              </button>
              <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1rem' }}>
                ✕
              </button>
            </div>
          </div>

          {/* Poetry Line */}
          <div style={{ color: '#00ffff', marginBottom: '20px', fontStyle: 'italic', fontSize: '0.9rem', borderLeft: '2px solid #00ffff', paddingLeft: '10px' }}>
            "{poetryLine}"
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask: e.g. Plastic Straw"
              style={{ flex: 1, background: '#111', border: '1px solid #333', color: 'white', padding: '8px', fontFamily: 'monospace' }}
            />
            <button onClick={handleAskHero} style={{ background: '#00ff41', color: 'black', border: 'none', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}>
              RUN
            </button>
          </div>

          {/* Output Area */}
          <div style={{ minHeight: '100px', fontSize: '0.9rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
            {loading ? "Analyzing biospheric impact..." : (aiResponse || "Awaiting target data...")}
          </div>

        </div>
      )}
    </div>
  );
}