import { defineConfig } from 'vite';

const backendUrl = process.env.VITE_BACKEND_URL;

export default defineConfig({
  server: {
    // The standalone browser game uses bundled map data and local saves. Enable
    // the API proxy only when a Django backend is explicitly configured.
    proxy: backendUrl ? { '/api': { target: backendUrl, changeOrigin: true } } : undefined,
  },
});
