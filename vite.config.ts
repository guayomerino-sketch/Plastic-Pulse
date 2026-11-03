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
  return {
    plugins: [react(), devVitals()],
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
