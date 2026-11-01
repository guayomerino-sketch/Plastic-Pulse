# Plastic Pulse

A field lab for young scientists. Keep your Home Biome alive, keep the pulse on the plastic threat, and invent real solutions.

Music: “Won’t You Be a Hero?” © 2019 Grecia & Eduardo Merino.
Opening quote: Jane Goodall.

## Run it on your computer

1. Install Node.js (LTS) from nodejs.org.
2. In this folder: `npm install`
3. `npm run dev`, then open the address it prints. To try it on your phone, run `npm run dev -- --host` and open the "Network" address on a phone on the same Wi-Fi.

## How the game works

- **Pulse**: your Home Biome and the Guardian. Log each plastic moment: Refused, Reused or Used it. Her health follows your choices.
- **Scan**: Specimen Files for each plastic (sourced facts). The AI photo scanner connects in Phase 2.
- **Lab**: Lab Challenges that follow the scientific method (question, hypothesis, method, data, conclusion).
- **Solutions**: the Problem of the Week. Pitch ideas as problem, idea, evidence.
- **World**: the 3D Earth and the weekly shared goal.

Ranks: Observer → Field Researcher → Analyst (needs a finished Lab Challenge) → Innovator (needs a pitched idea) → Biome Guardian.

## Code map

- `src/App.tsx`: app shell, navigation, intro, lyrics overlay
- `src/world/World3D.ts`: the 3D world (three.js): island, Guardian, ocean, Earth
- `src/audio/music.ts`: the song (vocal first, then instrumental loop; muffled when the biome is sick)
- `src/game/store.tsx`: game state, XP, ranks; saved on the device for now
- `src/data/specimens.ts`: sourced plastic facts. **Every number needs a source.**
- `src/data/content.ts`: challenges, weekly problems, ranks, song lines, quote
- `src/screens/*`: the five screens
- `src/services/scanner.ts`: talks to the scanner server (Phase 2)

## Rules we keep

- No API keys in the app. AI calls go through a server function.
- Impact numbers come from `specimens.ts`, never from the AI.
- Sample data is always labeled as sample.
- No public individual rankings (young players).

## Roadmap

- **Phase 1 (this branch)**: game shell, 3D biome + Guardian, Earth, music, specimens, lab, solutions, saved locally.
- **Phase 2**: Firebase (sign-in, shared goal, country ranking, community ideas and voting), scanner function with Gemini, share cards, class codes for schools.
- **Phase 3**: Android app (Capacitor) and Google Play release.
- **Phase 4**: sculpted Guardian model, logo, more challenges and specimens.
