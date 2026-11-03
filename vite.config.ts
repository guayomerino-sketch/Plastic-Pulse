import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// In development, answer /api/vitals the same way the Vercel function does in production.
const devVitals = (): Plugin => ({
  name: 'dev-vitals',
  configureServer(server) {
    // There are no Vercel location headers locally, so pretend to be in Los Angeles.
    server.middlewares.use('/api/where', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ city: 'Los Angeles', country: 'US', lat: 34.1, lng: -118.2 }));
    });
    // The scanner locally: same code as api/scan.ts, minus the sign-in check (the emulators' tokens aren't signed).
    // With no ANTHROPIC_API_KEY in .env.local it answers 'not-configured', like production before the key is added.
    server.middlewares.use('/api/scan', (req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        const { identify, ScanError } = await server.ssrLoadModule('/server/scan.ts');
        res.setHeader('Content-Type', 'application/json');
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');
          res.end(JSON.stringify(await identify('local-dev', body.image)));
        } catch (err) {
          const e = err instanceof ScanError ? err : { status: 500, code: 'server-error' };
          res.statusCode = e.status; res.end(JSON.stringify({ error: e.code }));
        }
      });
    });
    server.middlewares.use('/api/vitals', async (_req, res) => {
      try {
        const { getVitals } = await server.ssrLoadModule('/server/vitals.ts');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(await getVitals()));
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load VITE_ prefixed env vars so import.meta.env.VITE_* is available at runtime
  loadEnv(mode, process.cwd(), 'VITE_');
  // Server-only secrets for the local api routes (never exposed to the app): ANTHROPIC_API_KEY from .env.local.
  const server = loadEnv(mode, process.cwd(), '');
  if (server.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY ??= server.ANTHROPIC_API_KEY;
  if (server.ANTHROPIC_MODEL) process.env.ANTHROPIC_MODEL ??= server.ANTHROPIC_MODEL;
  return {
    plugins: [react(), devVitals()],
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
