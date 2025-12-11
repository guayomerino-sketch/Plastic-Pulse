<!-- Copilot / AI agent instructions for the PlasticPulse repo -->
# PlasticPulse — Quick AI-agent guide

Purpose: give an AI coding assistant the minimal, high-value knowledge to be productive in this repo.

- Tech stack: Vite + React + TypeScript + Tailwind CSS. Client SPA; most logic lives in `App.tsx` and the `components/` directory.
- Local dev: run `npm install` then `npm run dev` (see `package.json`). Build with `npm run build` and preview with `npm run preview`.

What matters (big picture)
- `App.tsx` is the central orchestrator: global UI state (userStats, globePollution, currentView) is kept here and passed to child components. Look here first when changing app behavior.
- UI components are in `components/`. They are functional React components (default exports) that accept props and prefer Tailwind utility classes for styling.
- `services/geminiService.ts` is the single AI/external-service integration point. It uses `@google/genai` to call model `gemini-2.5-flash` for three kinds of tasks:
  - short motivational text: `getMotivationalTip(totalSavedGrams)`
  - textual biome impact descriptions: `getBiomeImpactAnalysis(itemName)`
  - image analysis/vision: `analyzePlasticImage(base64Image)` which expects a JSON object response and parses it (returned schema: {name, alternative, fact}).

Data flows & boundaries
- App state -> components: `App.tsx` passes state (e.g., `userStats`, `globePollution`) to components like `PlasticTracker`, `Globe`, and `Leaderboard`.
- AI calls are routed through `services/geminiService.ts`. If you need to change AI behavior, edit this file and keep callers thin.
- External resources: `Globe.tsx` loads world topology from the CDN `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` and uses `d3` + `topojson-client` to render a canvas globe.

Important, discoverable gotchas
- Env var name mismatch: README says to set `GEMINI_API_KEY` in `.env.local`, but `services/geminiService.ts` reads `process.env.API_KEY`. Keep this mismatch in mind when running locally or updating CI.
- The repo currently calls the GenAI client from a module that is imported by client-side code (`App.tsx`). If you change where keys are read or how the client is instantiated, be conscious of exposing secrets in client bundles — this repo appears to be a client-side SPA.
- `analyzePlasticImage` strips data-URL prefixes before sending base64 to the model; edits that change image handling must preserve that behavior.

Conventions and patterns (examples from codebase)
- Mock data: `PLASTIC_ITEMS` is declared inside `App.tsx` and passed down; small, self-contained list used by `PlasticTracker` and `ImpactGallery`.
- UI: prefer composition and small focused components. Example: `Globe` renders a canvas and accepts a single `pollutionLevel` prop.
- Asynchronous AI calls: callers expect a string or JSON-parsed object; `analyzePlasticImage` returns parsed JSON and logs on error.

Files to check when editing features
- `App.tsx` — global state, routing between views, mock data and main handlers (e.g., `handleLogItem`).
- `services/geminiService.ts` — AI integration and model names; change here to adjust prompts or models.
- `components/Globe.tsx` — D3 + canvas rendering; uses `WORLD_ATLAS_URL` constant.
- `components/PlasticTracker.tsx`, `ImpactGallery.tsx`, `Leaderboard.tsx` — examples of props-driven components that read from `App` state.
- `types.ts` — central TS types (e.g., `PlasticItem`, `UserStats`, `AppView`).

Developer workflows (how I actually run and debug)
- Install: `npm install`
- Local dev: `npm run dev` (Vite dev server). Open the Vite URL in the browser.
- Build: `npm run build`; quick preview: `npm run preview`.
- Environment: create `.env.local` at repo root with the API key. README suggests `GEMINI_API_KEY`; code references `API_KEY` — sync them if you change anything.

When editing code
- Keep changes minimal and component-scoped. Follow existing patterns: default exports, Tailwind classes, and state-lifting via props.
- If you need to change AI prompts or schema, update `services/geminiService.ts` and any callers that parse responses (notably `analyzePlasticImage`).

If you're not sure
- Start by running the app (`npm run dev`) and reproducing the UI area you plan to change. Use `App.tsx` console logs and the browser DevTools network tab to inspect AI calls.

Contact points for follow-up
- If the environment variable or key handling needs to change (server vs client), call it out in a PR and note security implications.

End of file.
