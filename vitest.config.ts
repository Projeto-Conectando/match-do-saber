import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node', // testes de componente declaram `// @vitest-environment jsdom` no topo
    setupFiles: ['tests/setup.ts'],
  },
});
