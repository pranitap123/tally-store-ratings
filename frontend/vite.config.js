import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:4000', changeOrigin: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // keep the 3D stack out of the entry bundle; it is only needed on the auth screens
        manualChunks(id) {
          if (/node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'three';
          if (/node_modules[\\/]framer-motion[\\/]/.test(id)) return 'motion';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
