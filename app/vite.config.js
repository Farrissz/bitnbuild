import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In dev, /api/* is forwarded to the routing server (routing/server.js on :3001).
// In production the routing server serves this app's dist/ folder itself, so /api is same-origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: { chunkSizeWarningLimit: 2000 },
});
