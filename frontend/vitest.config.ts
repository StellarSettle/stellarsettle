import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Snapshot tests must fail in CI when snapshots differ.
    // Updating snapshots requires an explicit `vitest -u` run locally.
    update: false,
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
