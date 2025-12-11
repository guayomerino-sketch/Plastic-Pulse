import React, { useEffect, useRef, useState } from 'react';

const MultiplierEffect: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'one' | 'expanding' | 'billions'>('one');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;
    let animationFrameId: number;
    
    // Configuration
    const PARTICLE_COUNT = 400; // Represents "billions" for performance
    
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      active: boolean;
      alpha: number;
    }

    let particles: Particle[] = [];
    const colors = ['#22d3ee', '#34d399', '#a78bfa', '#fbbf24']; // Cyan, Emerald, Purple, Amber

    // Initialize logic
    const reset = () => {
      width = containerRef.current?.clientWidth || 600;
      height = containerRef.current?.clientHeight || 300;
      canvas.width = width;
      canvas.height = height;

      particles = [];
      
      // Create the "One"
      particles.push({
        x: width / 2,
        y: height / 2,
        vx: 0,
        vy: 0,
        size: 6,
        color: '#ffffff',
        active: true,
        alpha: 1
      });
    };

    reset();

    const spawnParticle = (sourceX: number, sourceY: number) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: sourceX,
            y: sourceY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 2 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            active: true,
            alpha: 1
        });
    };

    const draw = () => {
      // Fade trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; // Dark slate background with trail
      ctx.fillRect(0, 0, width, height);

      // Logic based on phase
      if (phase === 'expanding' && particles.length < PARTICLE_COUNT) {
         // Exponential growth simulation: Randomly active particles spawn new ones
         const spawnChance = 0.1;
         const activeParticles = particles.filter(p => p.active);
         if (activeParticles.length > 0) {
            // Pick a random parent
            const parent = activeParticles[Math.floor(Math.random() * activeParticles.length)];
            if (Math.random() < spawnChance) {
                spawnParticle(parent.x, parent.y);
            }
         }
         
         // Force spawn from center if count is low
         if (particles.length < 10) {
             spawnParticle(width/2, height/2);
         }
      }

      if (particles.length >= PARTICLE_COUNT && phase === 'expanding') {
          // Transition state outside of render loop ideally, but this works for visual
          // We let React handle the text state change via useEffect dependency if needed, 
          // but for smooth anim we check length
      }

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Draw connections if close (only in billions phase for effect)
        if (phase === 'billions' || particles.length > 50) {
           // Simple proximity check optimization: only check a few neighbors to save FPS
           // (This is a simplified visual hack for performance)
        }
      });
      
      // Draw connections for the "Billions" effect (limited to nearest neighbors for performance)
      if (phase !== 'one') {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          for (let i = 0; i < particles.length; i+=2) { // Skip every other for perf
              const p1 = particles[i];
              // Connect to center if close
              const dx = p1.x - width/2;
              const dy = p1.y - height/2;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < 150) {
                 ctx.moveTo(width/2, height/2);
                 ctx.lineTo(p1.x, p1.y);
              }
          }
          ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => reset();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [phase]);

  // Handle phase transitions based on timers or interaction
  const handleInteraction = () => {
    if (phase === 'one') {
      setPhase('expanding');
      setTimeout(() => setPhase('billions'), 3000);
    } else if (phase === 'billions') {
      setPhase('one'); // Reset
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleInteraction}
      className="relative w-full h-80 bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl shadow-blue-900/20 group cursor-pointer transition-all hover:border-blue-500/50"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      
      {/* Overlay Text Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center z-10">
        
        <div className={`transition-all duration-1000 transform ${phase === 'one' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 absolute'}`}>
           <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 animate-pulse border border-white/20">
              <span className="text-3xl">☝️</span>
           </div>
           <h3 className="text-3xl font-black text-white mb-2">"I am only one..."</h3>
           <p className="text-slate-400 text-sm animate-bounce mt-4">Tap to act</p>
        </div>

        <div className={`transition-all duration-1000 transform ${phase === 'expanding' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 scale-95 absolute'}`}>
           <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-300 mb-2">"...but if more like me do the same..."</h3>
        </div>

        <div className={`transition-all duration-1000 delay-500 transform ${phase === 'billions' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 absolute'}`}>
           <h3 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-blue-400 to-purple-400 mb-4 drop-shadow-lg">
             "...we multiply the effects by billions."
           </h3>
           <p className="text-slate-300 font-medium italic">- Dr. Jane Goodall</p>
           <div className="mt-8 px-6 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest text-white border border-white/10 hover:bg-white/20 transition-colors pointer-events-auto">
              You are the spark
           </div>
        </div>

      </div>
      
      {/* Decorative Glow */}
      <div className={`absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-transparent pointer-events-none transition-opacity duration-1000 ${phase === 'billions' ? 'opacity-100' : 'opacity-0'}`}></div>
    </div>
  );
};

export default MultiplierEffect;
