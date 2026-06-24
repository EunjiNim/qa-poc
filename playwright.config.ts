import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
  retries: 1, // flaky 판정을 위한 자동 재시도
});
