# Plastic Pulse: project notes

Working notes for Claude sessions. Rules and tone live in `CLAUDE.md`; how the game works is in `README.md`.

## Where things are

- Repo: github.com/guayomerino-sketch/Plastic-Pulse. Local checkout: `~/Documents/GitHub/Plastic-Pulse`.
- Pushing: the shell has no GitHub login. Commit here, then push from GitHub Desktop.
  Commits use the GitHub no-reply email (set in this repo's git config); the private Gmail is blocked by GitHub.
- Firebase project: **PlasticPulse** (`plasticpulse-a921c`), free Spark plan, so no Cloud Functions yet.
  The Firebase CLI's global default is another project: always pass `--project plasticpulse-a921c`.
- Visual reference: the original 3D prototype, claude.ai/artifact/TnfxMdFzo4HJbCaX7VAU74.
- Preview hosting: plastic-pulse.vercel.app.

## Branches

- `game-phase-1` (PR #1): Phase 1 app, moved to the repo root.
- `game-phase-2`: Phase 2 work, based on `game-phase-1`.

## Next

1. ~~Fix PR #1 folder structure, make sure it builds, push.~~ Done.
2. Firebase foundation (on `game-phase-2`):
   - [x] Firebase SDK, loaded lazily (`src/services/firebase.ts`), anonymous sign-in.
   - [x] Live weekly shared goal (`src/services/sharedGoal.ts`, World screen), rules + emulator tests.
   - [ ] Enable Anonymous sign-in in the Firebase console, deploy `firestore.rules`.
   - [ ] Optional Google sign-in that upgrades the anonymous account, and cloud save of progress.
3. Country ranking (countries only, never individuals) and real city lights on the Earth view.
4. Community ideas and voting in the Solution Lab, with moderation before ideas go public (young players).
5. Scanner: a server function that holds the Gemini key (needs the Blaze plan, or another host).
6. Share cards.
7. Class codes for schools.
8. Phase 3: Android app (Capacitor), Google Play. Phase 4: sculpted Guardian, logo, more content.

## Decisions so far

- The shared goal starts at 50 kg per week (`SHARED_GOAL` in `content.ts`, `targetGrams()` in `firestore.rules`).
  The Phase 1 prototype showed 50 t as sample data, which is too far off for a new game.
- One choice can add at most 50 g to the shared goal (`MAX_GRAMS_PER_CHOICE`). Grams come only from `specimens.ts`.
- Each player's weekly part is readable only by that player.
