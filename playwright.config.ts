import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'node server.js',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
  retries: 1, // flaky 판정을 위한 자동 재시도

  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  
  expect: {
    // 픽셀이 최대 5%까지 달라도 통과(Pass)시켜줌 (숫자는 0.05 ~ 0.1 사이로 조절 가능)
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 } 
  },
});