import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages - uses repo name from env or defaults to '/'
  // Set VITE_BASE_PATH env var during build for custom path
  base: process.env.GITHUB_ACTIONS ? '/42x09_Cross-Stitcher/' : '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
