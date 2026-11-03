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
   - [x] Anonymous sign-in enabled (auto clean-up off, so players keep their id), `firestore.rules` deployed. Checked live: sign-in and the goal read work.
   - [x] Optional Google sign-in that upgrades the anonymous account in place, and cloud save of progress (`users/{uid}`, merged across devices; `src/services/account.ts`). Sign-out clears the device for shared school computers.
3. Specimen Book (from pilot feedback):
   - [x] Book tab, 3D hologram for every specimen, rarity (Common / Hidden / Rare), sets, first-discovery reveal and bonus XP.
   - [x] Batch 2: 8 more sourced plastics (15 total). They have no sourced mass yet, so they add 0 g to the shared goal.
   - [ ] Batch 3: more specimens; sourced typical masses so new items count toward the goal.
   - [x] Google Earth-style globe: relief, ocean glint, clouds, blue atmosphere, pinch-zoom, fly-to, zoom-out to a pale blue dot.
   - [x] Earth's vital signs, live: CO₂ (NOAA Mauna Loa), Arctic sea ice (NSIDC v4), Great Barrier Reef bleaching alerts (NOAA Coral Reef Watch), Amazon deforestation alerts (INPE DETER). Served by `api/vitals.ts` (Vercel function, cached 6 h); logic in `server/vitals.ts`. Climate Reanalyzer blocks automated access, so it is not used.
4. Country ranking (countries only, never individuals) and real city lights on the Earth view.
5. Community ideas and voting in the Solution Lab, with moderation before ideas go public (young players).
6. Scanner: a server function that holds the Gemini key (needs the Blaze plan, or another host).
7. Share cards.
8. Class codes for schools.
9. Phase 3: Android app (Capacitor), Google Play. Phase 4: sculpted Guardian, logo, more content.

## Pilot (started November 2026)

- 5–10 players aged 13+, known to Eduardo or a teacher, with a parent or teacher aware. One week, at least one budget Android phone.
- Watch 2–3 people play the first time without helping.
- Feedback: in-app form (World screen → "Tell us what you think"), saved to Firestore `feedback`.
  Read it in the Firebase console → Firestore → feedback. Players can add but never read it.
- After the week, pick the next feature from what players said.

## Decisions so far

- The shared goal was 2 kg per week for the pilot; from November 2026 it is 20 kg for an open audience (`SHARED_GOAL` in `content.ts`, `targetGrams()` in `firestore.rules`;
  change both and redeploy the rules). The Phase 1 prototype showed 50 t as sample data, far out of reach for a new game.
- One choice can add at most 50 g to the shared goal (`MAX_GRAMS_PER_CHOICE`). Grams come only from `specimens.ts`.
- Each player's weekly part is readable only by that player.
- Anti-spam (firestore.rules): one player adds at most 500 g per week to the shared goal, with 3 seconds between choices. Feedback rejects emails, phone numbers and links (same patterns in `src/services/feedback.ts`).
- The intro says the game is made for players aged 13 and up.
