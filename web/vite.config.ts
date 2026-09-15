import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev server proxies /api to the Express server so cookies stay same-origin
 * (no CORS config needed) and the production build can be served by the API.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4311,
    host: '127.0.0.1',
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:4310',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.API_URL || 'http://127.0.0.1:4310',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
