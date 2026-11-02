# Plastic Pulse: notes for Claude

- Owner: Eduardo Merino. Audience: teens and young adults (13+). Tone: serious but playful; progress is earned; the goal is real solutions, not points.
- Stack: Vite + React + TypeScript; three.js for the 3D world; plain CSS in `index.css` (tokens at the top). Tailwind is installed but not used.
- Visual system: "Starship Glass" (deep navy #04070f, liquid-glass panels, starship-console readouts, teal #3ee6c8 for good actions, violet for science, amber for alerts). Specimen Files are hologram-style glass cards. Budget phones get the same look without live blur (`.app.lite`). Fonts: Space Grotesk, Inter, JetBrains Mono, Instrument Serif.
- Music: instrumental only during play (pilot feedback); lyrics appear as on-screen lines.
- Only one quote, kept constant: Jane Goodall, "What you do makes a difference, and you have to decide what kind of difference you want to make."
- Song credit: “Won’t You Be a Hero?” by Grecia & Eduardo Merino.
- Facts in `src/data/specimens.ts` must be sourced; the AI must never invent impact numbers.
- Never put API keys in client code. Target budget Android phones: keep the 3D quality tiers working.
