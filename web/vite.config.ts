import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Bind to all interfaces so phones on the same Wi-Fi can reach it
    host: true,
    // Proxy API calls to the backend so the web app can use relative /api paths
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
