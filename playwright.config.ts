import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1366, height: 768 } },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true },
});
