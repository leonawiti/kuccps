/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development, requests to /api go to the API running on this computer (see ../backend).
  server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: false } } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
