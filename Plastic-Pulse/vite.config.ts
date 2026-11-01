import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load VITE_ prefixed env vars so import.meta.env.VITE_* is available at runtime
  loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});